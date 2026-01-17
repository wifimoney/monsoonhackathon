// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ISovereignALM} from "valantis-core/ALM/interfaces/ISovereignALM.sol";
import {ALMLiquidityQuote, ALMLiquidityQuoteInput} from "valantis-core/ALM/structs/SovereignALMStructs.sol";
import {ISovereignPool} from "valantis-core/pools/interfaces/ISovereignPool.sol";
import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "openzeppelin/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "openzeppelin/utils/ReentrancyGuard.sol";

/// @title IHyperCoreQuoter - Interface for price quoter
interface IHyperCoreQuoter {
    function getMidPrice() external view returns (uint256);
    function isPrecompileActive() external view returns (bool);
}

/// @title MonsoonALM - Valantis Liquidity Module with HyperCore price reference
/// @author Monsoon Team
/// @notice Implements ISovereignALM with constant-product (x*y=k) pricing
/// @dev Deployed and registered with a Sovereign Pool on HyperEVM
contract MonsoonALM is ISovereignALM, ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;
    
    /// @notice Maximum swap fee (1%)
    uint256 public constant MAX_FEE_BPS = 100;
    
    /// @notice Minimum liquidity locked forever (prevents division by zero)
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    // ============ IMMUTABLES ============
    
    /// @notice Sovereign Pool this ALM is registered with
    ISovereignPool public immutable pool;
    
    /// @notice Price quoter (reads HyperCore)
    IHyperCoreQuoter public immutable quoter;
    
    /// @notice Token0 of the pool
    IERC20 public immutable token0;
    
    /// @notice Token1 of the pool
    IERC20 public immutable token1;

    // ============ STATE ============
    
    /// @notice Address with strategist privileges
    address public strategist;
    
    /// @notice Swap fee in basis points (default 0.3%)
    uint256 public swapFeeBps = 30;
    
    /// @notice Token0 allocated to orderbook (not available for AMM)
    uint256 public obAllocation0;
    
    /// @notice Token1 allocated to orderbook (not available for AMM)
    uint256 public obAllocation1;
    
    /// @notice Pause flag for emergencies
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
    
    event SwapExecuted(
        address indexed sender,
        bool isZeroToOne,
        uint256 amountIn,
        uint256 amountOut,
        uint256 oraclePrice,
        uint256 effectivePrice
    );
    
    event FeesUpdated(uint256 oldFeeBps, uint256 newFeeBps);
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

    /// @notice Deploy MonsoonALM
    /// @param _pool Sovereign Pool address
    /// @param _quoter HyperCore price quoter address
    /// @param _strategist Initial strategist address
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
    }

    // ============ ISovereignALM IMPLEMENTATION ============

    /// @notice Called by Sovereign Pool during swap to get liquidity quote
    /// @dev Core pricing logic - uses x*y=k constant product formula
    /// @param _input Swap input parameters from pool
    /// @return quote Liquidity quote with amounts
    function getLiquidityQuote(
        ALMLiquidityQuoteInput memory _input,
        bytes calldata, /* _externalContext */
        bytes calldata  /* _verifierData */
    ) external view override returns (ALMLiquidityQuote memory quote) {
        if (paused) {
            // Return zero quote when paused
            return quote;
        }
        
        // Get available reserves (excluding OB allocations)
        (uint256 reserve0, uint256 reserve1) = getAMMReserves();
        
        if (reserve0 == 0 || reserve1 == 0) {
            // No liquidity
            return quote;
        }
        
        // Apply fee to input
        uint256 amountInAfterFee = (_input.amountInMinusFee * (BPS - swapFeeBps)) / BPS;
        
        // Constant product formula: x * y = k
        if (_input.isZeroToOne) {
            // token0 → token1
            // dy = (y * dx) / (x + dx)
            uint256 numerator = reserve1 * amountInAfterFee;
            uint256 denominator = reserve0 + amountInAfterFee;
            quote.amountOut = numerator / denominator;
            quote.amountInFilled = _input.amountInMinusFee;
            
            // Cap at available reserve
            if (quote.amountOut > reserve1) {
                quote.amountOut = reserve1 - 1; // Leave 1 wei
                // Recalculate input needed
                quote.amountInFilled = (reserve0 * quote.amountOut) / (reserve1 - quote.amountOut);
                quote.amountInFilled = (quote.amountInFilled * BPS) / (BPS - swapFeeBps);
            }
        } else {
            // token1 → token0
            // dx = (x * dy) / (y + dy)
            uint256 numerator = reserve0 * amountInAfterFee;
            uint256 denominator = reserve1 + amountInAfterFee;
            quote.amountOut = numerator / denominator;
            quote.amountInFilled = _input.amountInMinusFee;
            
            // Cap at available reserve
            if (quote.amountOut > reserve0) {
                quote.amountOut = reserve0 - 1;
                quote.amountInFilled = (reserve1 * quote.amountOut) / (reserve0 - quote.amountOut);
                quote.amountInFilled = (quote.amountInFilled * BPS) / (BPS - swapFeeBps);
            }
        }
    }

    /// @notice Callback after deposit into pool
    /// @dev Mints LP tokens proportional to deposit
    function onDepositLiquidityCallback(
        uint256 _amount0,
        uint256 _amount1,
        bytes memory _data
    ) external override onlyPool {
        address depositor = abi.decode(_data, (address));
        
        uint256 shares;
        uint256 totalSupply_ = totalSupply();
        
        if (totalSupply_ == 0) {
            // First deposit: shares = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
            shares = _sqrt(_amount0 * _amount1);
            if (shares <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            shares -= MINIMUM_LIQUIDITY;
            
            // Lock minimum liquidity forever (mint to zero address)
            _mint(address(0xdead), MINIMUM_LIQUIDITY);
        } else {
            // Subsequent deposits: proportional to existing reserves
            (uint256 r0, uint256 r1) = getTotalReserves();
            
            uint256 shares0 = r0 > 0 ? (_amount0 * totalSupply_) / r0 : 0;
            uint256 shares1 = r1 > 0 ? (_amount1 * totalSupply_) / r1 : 0;
            
            // Take minimum to prevent manipulation
            shares = shares0 < shares1 ? shares0 : shares1;
        }
        
        if (shares == 0) revert InvalidAmount();
        
        _mint(depositor, shares);
        
        emit Deposit(depositor, _amount0, _amount1, shares, depositor);
    }

    /// @notice Callback after swap execution
    /// @dev Used for event emission and tracking
    function onSwapCallback(
        bool _isZeroToOne,
        uint256 _amountIn,
        uint256 _amountOut
    ) external override onlyPool {
        uint256 oraclePrice = quoter.getMidPrice();
        
        // Calculate effective price for logging
        uint256 effectivePrice;
        if (_isZeroToOne) {
            effectivePrice = (_amountOut * 1e18) / _amountIn;
        } else {
            effectivePrice = (_amountIn * 1e18) / _amountOut;
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

    /// @notice Deposit liquidity and receive LP tokens
    /// @param _amount0 Amount of token0 to deposit
    /// @param _amount1 Amount of token1 to deposit
    /// @param _minShares Minimum LP tokens to receive
    /// @param _recipient Address to receive LP tokens
    /// @return shares LP tokens minted
    function deposit(
        uint256 _amount0,
        uint256 _amount1,
        uint256 _minShares,
        address _recipient
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (_amount0 == 0 && _amount1 == 0) revert InvalidAmount();
        if (_recipient == address(0)) revert ZeroAddress();
        
        // Transfer tokens to this contract
        if (_amount0 > 0) {
            token0.safeTransferFrom(msg.sender, address(this), _amount0);
            token0.safeIncreaseAllowance(address(pool), _amount0);
        }
        if (_amount1 > 0) {
            token1.safeTransferFrom(msg.sender, address(this), _amount1);
            token1.safeIncreaseAllowance(address(pool), _amount1);
        }
        
        // Encode recipient for callback
        bytes memory depositData = abi.encode(_recipient);
        
        // Deposit to Sovereign Pool
        pool.depositLiquidity(
            _amount0,
            _amount1,
            msg.sender,
            "",          // verificationContext
            depositData  // passed to onDepositLiquidityCallback
        );
        
        shares = balanceOf(_recipient);
        if (shares < _minShares) revert SlippageExceeded();
    }

    /// @notice Withdraw liquidity by burning LP tokens
    /// @param _shares LP tokens to burn
    /// @param _minAmount0 Minimum token0 to receive
    /// @param _minAmount1 Minimum token1 to receive
    /// @param _recipient Address to receive tokens
    /// @return amount0 Token0 withdrawn
    /// @return amount1 Token1 withdrawn
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
        (uint256 r0, uint256 r1) = getTotalReserves();
        
        // Calculate proportional amounts
        amount0 = (_shares * r0) / totalSupply_;
        amount1 = (_shares * r1) / totalSupply_;
        
        if (amount0 < _minAmount0 || amount1 < _minAmount1) {
            revert SlippageExceeded();
        }
        
        // Burn LP tokens first
        _burn(msg.sender, _shares);
        
        // Withdraw from pool
        pool.withdrawLiquidity(
            amount0,
            amount1,
            msg.sender,
            _recipient,
            ""  // verificationContext
        );
        
        emit Withdraw(msg.sender, amount0, amount1, _shares, _recipient);
    }

    // ============ STRATEGIST FUNCTIONS ============

    /// @notice Allocate reserves to orderbook (emits event for off-chain executor)
    /// @dev Does not actually move tokens - just tracks allocation
    /// @param _amount0 Token0 amount to allocate
    /// @param _amount1 Token1 amount to allocate
    /// @param _isBid True if allocating for bid orders (uses token1)
    function allocateToOB(
        uint256 _amount0,
        uint256 _amount1,
        bool _isBid
    ) external onlyStrategist whenNotPaused {
        (uint256 available0, uint256 available1) = getAMMReserves();
        
        if (_isBid) {
            // Bid orders use token1
            if (_amount1 > available1) revert InsufficientLiquidity();
            obAllocation1 += _amount1;
        } else {
            // Ask orders use token0
            if (_amount0 > available0) revert InsufficientLiquidity();
            obAllocation0 += _amount0;
        }
        
        emit AllocateToOB(_amount0, _amount1, _isBid, block.timestamp);
    }

    /// @notice Deallocate reserves from orderbook
    /// @dev Called when OB orders are filled/cancelled
    /// @param _amount0 Token0 to deallocate
    /// @param _amount1 Token1 to deallocate
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

    /// @notice Update swap fee
    /// @param _feeBps New fee in basis points
    function setSwapFee(uint256 _feeBps) external onlyStrategist {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        
        emit FeesUpdated(swapFeeBps, _feeBps);
        swapFeeBps = _feeBps;
    }

    /// @notice Transfer strategist role
    /// @param _newStrategist New strategist address
    function setStrategist(address _newStrategist) external onlyStrategist {
        if (_newStrategist == address(0)) revert ZeroAddress();
        
        emit StrategistUpdated(strategist, _newStrategist);
        strategist = _newStrategist;
    }

    /// @notice Pause deposits and swaps
    function pause() external onlyStrategist {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause
    function unpause() external onlyStrategist {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get reserves available for AMM (total minus OB allocations)
    /// @return reserve0 Available token0
    /// @return reserve1 Available token1
    function getAMMReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        (uint256 total0, uint256 total1) = getTotalReserves();
        reserve0 = total0 > obAllocation0 ? total0 - obAllocation0 : 0;
        reserve1 = total1 > obAllocation1 ? total1 - obAllocation1 : 0;
    }

    /// @notice Get total reserves from Sovereign Pool
    /// @return reserve0 Total token0
    /// @return reserve1 Total token1
    function getTotalReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        (reserve0, reserve1) = pool.getReserves();
    }

    /// @notice Get swap quote (for frontend)
    /// @param _isZeroToOne Direction of swap
    /// @param _amountIn Input amount
    /// @return amountOut Expected output
    /// @return oraclePrice Current oracle price
    /// @return priceImpactBps Price impact in basis points
    function getAmountOut(
        bool _isZeroToOne,
        uint256 _amountIn
    ) external view returns (
        uint256 amountOut,
        uint256 oraclePrice,
        uint256 priceImpactBps
    ) {
        (uint256 r0, uint256 r1) = getAMMReserves();
        oraclePrice = quoter.getMidPrice();
        
        if (r0 == 0 || r1 == 0) {
            return (0, oraclePrice, 0);
        }
        
        uint256 amountInAfterFee = (_amountIn * (BPS - swapFeeBps)) / BPS;
        
        if (_isZeroToOne) {
            amountOut = (r1 * amountInAfterFee) / (r0 + amountInAfterFee);
            
            // Calculate price impact
            uint256 spotPrice = (r1 * 1e18) / r0;
            uint256 execPrice = (amountOut * 1e18) / _amountIn;
            if (spotPrice > execPrice) {
                priceImpactBps = ((spotPrice - execPrice) * BPS) / spotPrice;
            }
        } else {
            amountOut = (r0 * amountInAfterFee) / (r1 + amountInAfterFee);
            
            uint256 spotPrice = (r0 * 1e18) / r1;
            uint256 execPrice = (amountOut * 1e18) / _amountIn;
            if (spotPrice > execPrice) {
                priceImpactBps = ((spotPrice - execPrice) * BPS) / spotPrice;
            }
        }
    }

    /// @notice Get pool info for frontend
    /// @return poolAddress The address of the pool
    /// @return token0Address The address of token0
    /// @return token1Address The address of token1
    /// @return totalReserve0 Total reserve of token0
    /// @return totalReserve1 Total reserve of token1
    /// @return ammReserve0 AMM reserve of token0
    /// @return ammReserve1 AMM reserve of token1
    /// @return obAlloc0 Orderbook allocation of token0
    /// @return obAlloc1 Orderbook allocation of token1
    /// @return lpTotalSupply LP token total supply
    /// @return feeBps Swap fee in basis points
    /// @return isPaused Whether the ALM is paused
    /// @return oraclePrice The current oracle price
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
            swapFeeBps,
            paused,
            quoter.getMidPrice()
        );
    }

    // ============ INTERNAL ============

    /// @notice Babylonian square root
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
