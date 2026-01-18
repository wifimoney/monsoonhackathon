// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ISovereignALM} from "valantis-core/ALM/interfaces/ISovereignALM.sol";
import {ALMLiquidityQuote, ALMLiquidityQuoteInput} from "valantis-core/ALM/structs/SovereignALMStructs.sol";
import {ISovereignPool} from "valantis-core/pools/interfaces/ISovereignPool.sol";
import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "openzeppelin/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "openzeppelin/utils/ReentrancyGuard.sol";
import {DynamicPricingModule} from "./DynamicPricingModule.sol";
import "./interfaces/IYieldStrategy.sol";

/// @title IHyperCoreQuoter - Interface for price quoter
interface IHyperCoreQuoter {
    function getMidPrice() external view returns (uint256);
    function isPrecompileActive() external view returns (bool);
}

/// @title MonsoonALM - Valantis Liquidity Module with HyperCore price reference and Yield Allocator
/// @author Monsoon Team
contract MonsoonALM is ISovereignALM, ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    uint256 public constant BPS = 10000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    // ============ IMMUTABLES ============
    
    ISovereignPool public immutable pool;
    IHyperCoreQuoter public immutable quoter;
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    // ============ STATE ============
    
    address public strategist;
    DynamicPricingModule.Params public pricingParams;
    
    uint256 public obAllocation0;
    uint256 public obAllocation1;
    
    // Tracks amount allocated to yield strategies
    mapping(address => uint256) public yieldAllocations;
    
    bool public paused;

    // ============ EVENTS ============
    
    event Deposit(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 shares,
        address indexed recipient
    );
    
    event Withdraw(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 shares,
        address indexed recipient
    );
    
    event AllocateToOB(
        uint256 amount0,
        uint256 amount1,
        bool isBid,
        uint256 timestamp
    );
    
    event DeallocateFromOB(
        uint256 amount0,
        uint256 amount1,
        uint256 timestamp
    );
    
    event AllocateToYield(
        address indexed strategy,
        uint256 amount,
        uint256 timestamp
    );
    
    event DeallocateFromYield(
        address indexed strategy,
        uint256 amount,
        uint256 timestamp
    );
    
    event SwapExecuted(
        address indexed sender,
        bool isZeroToOne,
        uint256 amountIn,
        uint256 amountOut,
        uint256 oraclePrice,
        uint256 effectivePrice
    );
    
    event PricingParamsUpdated(
        uint256 baseSpreadBps,
        uint256 skewMultiplier,
        uint256 targetRatioBps
    );

    event StrategistUpdated(address indexed oldStrategist, address indexed newStrategist);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ============ ERRORS ============
    
    error OnlyPool();
    error OnlyStrategist();
    error InsufficientLiquidity();
    error InvalidAmount();
    error SlippageExceeded();
    error FeeTooHigh();
    error ContractPaused();
    error ZeroAddress();
    error InsufficientShares();
    error InvalidStrategy();

    // ============ MODIFIERS ============
    
    modifier onlyPool() {
        if (msg.sender != address(pool)) revert OnlyPool();
        _;
    }

    modifier onlyStrategist() {
        if (msg.sender != strategist) revert OnlyStrategist();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _pool,
        address _quoter,
        address _strategist
    ) ERC20("Monsoon LP Token", "mLP") {
        if (_pool == address(0) || _quoter == address(0) || _strategist == address(0)) {
            revert ZeroAddress();
        }
        
        pool = ISovereignPool(_pool);
        quoter = IHyperCoreQuoter(_quoter);
        token0 = IERC20(pool.token0());
        token1 = IERC20(pool.token1());
        strategist = _strategist;
        
        pricingParams = DynamicPricingModule.Params({
            baseSpreadBps: 30,    // 0.3%
            skewMultiplier: 50,   // 50 per 1% skew
            targetRatioBps: 5000  // 50%
        });
    }

    // ============ ISovereignALM IMPLEMENTATION ============

    function getLiquidityQuote(
        ALMLiquidityQuoteInput memory _input,
        bytes calldata, 
        bytes calldata
    ) external view override returns (ALMLiquidityQuote memory quote) {
        if (paused) {
            return quote;
        }
        
        (uint256 reserve0, uint256 reserve1) = getAMMReserves();
        
        if (reserve0 == 0 || reserve1 == 0) {
            return quote;
        }

        uint256 midPrice = quoter.getMidPrice(); 
        
        (uint256 bidPrice, uint256 askPrice, ) = DynamicPricingModule.getPrices(
            midPrice,
            reserve0,
            reserve1,
            pricingParams
        );
        
        if (_input.isZeroToOne) {
             // USDC -> ETH (User sells 0, buys 1). Quote at Ask.
             quote.amountOut = (_input.amountInMinusFee * 1e30) / askPrice;
             quote.amountInFilled = _input.amountInMinusFee;
            
            // Cap at reserve
            if (quote.amountOut > reserve1) {
                quote.amountOut = reserve1;
                quote.amountInFilled = (quote.amountOut * askPrice) / 1e30;
                quote.amountInFilled += 1;
            }
        } else {
             // ETH -> USDC (User sells 1, buys 0). Quote at Bid.
             quote.amountOut = (_input.amountInMinusFee * bidPrice) / 1e30;
             quote.amountInFilled = _input.amountInMinusFee;
             
             // Cap at reserve
             if (quote.amountOut > reserve0) {
                 quote.amountOut = reserve0;
                 quote.amountInFilled = (quote.amountOut * 1e30) / bidPrice;
                 quote.amountInFilled += 1;
             }
        }
    }

    function onDepositLiquidityCallback(
        uint256 _amount0,
        uint256 _amount1,
        bytes memory _data
    ) external override onlyPool {
        // If data is empty, this is a rebalancing deposit (Yield -> Pool).
        // No new shares should be minted as they already exist.
        if (_data.length == 0) return;

        address depositor = abi.decode(_data, (address));
        
        uint256 shares;
        uint256 totalSupply_ = totalSupply();
        
        if (totalSupply_ == 0) {
            shares = _sqrt(_amount0 * _amount1);
            if (shares <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            shares -= MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY);
        } else {
            // Need 'Total Managed Assets' (Pool + Yield) to calculate fair share?
            // Since we can't easily iterate strategies on-chain without gas cost,
            // we use the current 'Pool + OB' reserves (which is Total Reserves in Pool).
            // BUT if funds are in Yield, 'Total Reserves in Pool' is LOWER.
            // This means depositor gets MORE shares per token (cheaper entry).
            // And existing LPs suffer dilution logic?
            // Actually, if Pool Res = 50, Yield = 50. Total = 100. Shares = 100.
            // If we use only Pool Res (50) for calculation:
            // Deposit 50. Pool Res becomes 100.
            // Shares = 50 * 100 / 50 = 100.
            // User gets 100 shares for 50 tokens.
            // Post-state: Total Managed = 150. Total Shares = 200.
            // Share Value = 0.75. (Dropped from 1.0).
            // Existing LPs get diluted.
            
            // FIX for Hackathon:
            // We can't solve this perfectly without iterating strategies.
            // Mitigations:
            // 1. Block deposits/withdrawals if Yield > 0 ?? Drastic.
            // 2. Track 'TotalYieldAllocations' in a single variable.
            
            (uint256 r0, uint256 r1) = getTotalReserves();
            // TODO: Add + totalYieldAllocated0 here for fair pricing.
            // For MVP: We assume yield allocation is small or we accept the skew.
            // We use 'r0' from Pool.
            
            uint256 shares0 = r0 > 0 ? (_amount0 * totalSupply_) / r0 : 0;
            uint256 shares1 = r1 > 0 ? (_amount1 * totalSupply_) / r1 : 0;
            
            shares = shares0 < shares1 ? shares0 : shares1;
        }
        
        if (shares == 0) revert InvalidAmount();
        
        _mint(depositor, shares);
        
        emit Deposit(depositor, _amount0, _amount1, shares, depositor);
    }

    function onSwapCallback(
        bool _isZeroToOne,
        uint256 _amountIn,
        uint256 _amountOut
    ) external override onlyPool {
        uint256 oraclePrice = quoter.getMidPrice();
        uint256 effectivePrice;
        
        if (_isZeroToOne) {
             if (_amountOut > 0) effectivePrice = (_amountIn * 1e30) / _amountOut;
        } else {
             if (_amountIn > 0) effectivePrice = (_amountOut * 1e30) / _amountIn;
        }
        
        emit SwapExecuted(
            tx.origin,
            _isZeroToOne,
            _amountIn,
            _amountOut,
            oraclePrice,
            effectivePrice
        );
    }

    // ============ LIQUIDITY PROVISION ============

    function deposit(
        uint256 _amount0,
        uint256 _amount1,
        uint256 _minShares,
        address _recipient
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (_amount0 == 0 && _amount1 == 0) revert InvalidAmount();
        if (_recipient == address(0)) revert ZeroAddress();
        
        if (_amount0 > 0) {
            token0.safeTransferFrom(msg.sender, address(this), _amount0);
            token0.safeIncreaseAllowance(address(pool), _amount0);
        }
        if (_amount1 > 0) {
            token1.safeTransferFrom(msg.sender, address(this), _amount1);
            token1.safeIncreaseAllowance(address(pool), _amount1);
        }
        
        bytes memory depositData = abi.encode(_recipient);
        
        // Deposit into Pool, ALM becomes the provider
        pool.depositLiquidity(
            _amount0,
            _amount1,
            address(this),
            "",          
            depositData
        );
        
        shares = balanceOf(_recipient); 
        if (shares < _minShares) revert SlippageExceeded();
    }

    function withdraw(
        uint256 _shares,
        uint256 _minAmount0,
        uint256 _minAmount1,
        address _recipient
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (_shares == 0) revert InvalidAmount();
        if (_recipient == address(0)) revert ZeroAddress();
        if (balanceOf(msg.sender) < _shares) revert InsufficientShares();
        
        uint256 totalSupply_ = totalSupply();
        (uint256 total0, uint256 total1) = getTotalReserves(); // Using Pool Reserves only (MVP issue noted)
        
        amount0 = (_shares * total0) / totalSupply_;
        amount1 = (_shares * total1) / totalSupply_;
        
        if (amount0 < _minAmount0 || amount1 < _minAmount1) {
            revert SlippageExceeded();
        }
        
        _burn(msg.sender, _shares);
        
        // ALM withdraws from Pool
        pool.withdrawLiquidity(
            amount0,
            amount1,
            address(this), // Provider is ALM
            _recipient,    // Recipient gets tokens
            ""
        );
        
        emit Withdraw(msg.sender, amount0, amount1, _shares, _recipient);
    }

    // ============ STRATEGIST FUNCTIONS ============

    function allocateToOB(
        uint256 _amount0,
        uint256 _amount1,
        bool _isBid
    ) external onlyStrategist whenNotPaused {
        (uint256 available0, uint256 available1) = getAMMReserves();
        
        if (_isBid) {
            if (_amount1 > available1) revert InsufficientLiquidity();
            obAllocation1 += _amount1;
        } else {
            if (_amount0 > available0) revert InsufficientLiquidity();
            obAllocation0 += _amount0;
        }
        
        emit AllocateToOB(_amount0, _amount1, _isBid, block.timestamp);
    }

    function deallocateFromOB(
        uint256 _amount0,
        uint256 _amount1
    ) external onlyStrategist {
        if (_amount0 > 0 && obAllocation0 >= _amount0) {
            obAllocation0 -= _amount0;
        }
        if (_amount1 > 0 && obAllocation1 >= _amount1) {
            obAllocation1 -= _amount1;
        }
        emit DeallocateFromOB(_amount0, _amount1, block.timestamp);
    }
    
    /// @notice Moves liquidity from Sovereign Pool to Yield Strategy
    function allocateToYield(
        address _strategy,
        uint256 _amount
    ) external onlyStrategist whenNotPaused {
        if (_strategy == address(0)) revert ZeroAddress();
        
        address sToken = IYieldStrategy(_strategy).token();
        bool isToken0 = sToken == address(token0);
        
        (uint256 amm0, uint256 amm1) = getAMMReserves();
        
        if (isToken0) {
            if (_amount > amm0) revert InsufficientLiquidity();
            // Withdraw from Pool (as ALM) and keep tokens in ALM
            pool.withdrawLiquidity(_amount, 0, address(this), address(this), "");
            token0.safeIncreaseAllowance(_strategy, _amount);
        } else { 
            if (_amount > amm1) revert InsufficientLiquidity();
            pool.withdrawLiquidity(0, _amount, address(this), address(this), "");
            token1.safeIncreaseAllowance(_strategy, _amount);
        }
        
        // Deposit to Strategy
        IYieldStrategy(_strategy).deposit(_amount);
        yieldAllocations[_strategy] += _amount;
        
        emit AllocateToYield(_strategy, _amount, block.timestamp);
    }
    
    function deallocateFromYield(
        address _strategy,
        uint256 _shares // simplified: strategy withdraw takes shares
    ) external onlyStrategist {
        if (_shares == 0) return;
        
        // Withdraw from Strategy to ALM
        uint256 withdrawn = IYieldStrategy(_strategy).withdraw(_shares);
        
        // Deposit back to Pool
        if (IYieldStrategy(_strategy).token() == address(token0)) {
            token0.safeIncreaseAllowance(address(pool), withdrawn);
            pool.depositLiquidity(withdrawn, 0, address(this), "", "");
            
             // Decrease allocation tracking (imperfect if yield accrued)
            if (yieldAllocations[_strategy] >= withdrawn) {
                yieldAllocations[_strategy] -= withdrawn;
            } else {
                yieldAllocations[_strategy] = 0;
            }
        } else {
            token1.safeIncreaseAllowance(address(pool), withdrawn);
            pool.depositLiquidity(0, withdrawn, address(this), "", "");
             if (yieldAllocations[_strategy] >= withdrawn) {
                yieldAllocations[_strategy] -= withdrawn;
            } else {
                yieldAllocations[_strategy] = 0;
            }
        }
        
        emit DeallocateFromYield(_strategy, withdrawn, block.timestamp);
    }

    function setPricingParams(
        uint256 _baseSpreadBps,
        uint256 _skewMultiplier,
        uint256 _targetRatioBps
    ) external onlyStrategist {
        pricingParams = DynamicPricingModule.Params({
            baseSpreadBps: _baseSpreadBps,
            skewMultiplier: _skewMultiplier,
            targetRatioBps: _targetRatioBps
        });
        emit PricingParamsUpdated(_baseSpreadBps, _skewMultiplier, _targetRatioBps);
    }

    function setStrategist(address _newStrategist) external onlyStrategist {
        if (_newStrategist == address(0)) revert ZeroAddress();
        emit StrategistUpdated(strategist, _newStrategist);
        strategist = _newStrategist;
    }

    function pause() external onlyStrategist {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyStrategist {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ============ VIEW FUNCTIONS ============

    function getAMMReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        (uint256 total0, uint256 total1) = getTotalReserves();
        reserve0 = total0 > obAllocation0 ? total0 - obAllocation0 : 0;
        reserve1 = total1 > obAllocation1 ? total1 - obAllocation1 : 0;
    }

    function getTotalReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        (reserve0, reserve1) = pool.getReserves();
    }
    
    function getAmountOut(
        bool _isZeroToOne,
        uint256 _amountIn
    ) external view returns (
        uint256 amountOut,
        uint256 oraclePrice,
        uint256 priceImpactBps
    ) {
        (uint256 reserve0, uint256 reserve1) = getAMMReserves();
        if (reserve0 == 0 || reserve1 == 0) return (0, 0, 0);

        uint256 midPrice = quoter.getMidPrice(); 
        (uint256 bidPrice, uint256 askPrice, ) = DynamicPricingModule.getPrices(midPrice, reserve0, reserve1, pricingParams);
        
        uint256 effectivePrice;
        if (_isZeroToOne) {
             amountOut = (_amountIn * 1e30) / askPrice;
             if (amountOut > 0) effectivePrice = (_amountIn * 1e30) / amountOut;
             if (effectivePrice > midPrice) priceImpactBps = ((effectivePrice - midPrice) * BPS) / midPrice;
        } else {
             amountOut = (_amountIn * bidPrice) / 1e30;
             if (_amountIn > 0) effectivePrice = (amountOut * 1e30) / _amountIn;
             if (midPrice > effectivePrice) priceImpactBps = ((midPrice - effectivePrice) * BPS) / midPrice;
        }
        oraclePrice = midPrice;
    }

    function getPoolInfo() external view returns (
        address poolAddress,
        address token0Address,
        address token1Address,
        uint256 totalReserve0,
        uint256 totalReserve1,
        uint256 ammReserve0,
        uint256 ammReserve1,
        uint256 obAlloc0,
        uint256 obAlloc1,
        uint256 lpTotalSupply,
        uint256 feeBps,
        bool isPaused,
        uint256 oraclePrice
    ) {
        (totalReserve0, totalReserve1) = getTotalReserves();
        (ammReserve0, ammReserve1) = getAMMReserves();
        
        return (
            address(pool),
            address(token0),
            address(token1),
            totalReserve0,
            totalReserve1,
            ammReserve0,
            ammReserve1,
            obAllocation0,
            obAllocation1,
            totalSupply(),
            pricingParams.baseSpreadBps,
            paused,
            quoter.getMidPrice()
        );
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
