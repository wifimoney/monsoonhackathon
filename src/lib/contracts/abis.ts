export const MONSOON_ALM_ABI = [
    // ============ DEPOSIT/WITHDRAW ============
    'function deposit(uint256 _amount0, uint256 _amount1, uint256 _minShares, address _recipient) external returns (uint256 shares)',
    'function withdraw(uint256 _shares, uint256 _minAmount0, uint256 _minAmount1, address _recipient) external returns (uint256 amount0, uint256 amount1)',

    // ============ VIEW FUNCTIONS ============
    'function getAmountOut(bool _isZeroToOne, uint256 _amountIn) external view returns (uint256 amountOut, uint256 oraclePrice, uint256 priceImpactBps)',
    'function getAMMReserves() external view returns (uint256 reserve0, uint256 reserve1)',
    'function getTotalReserves() external view returns (uint256 reserve0, uint256 reserve1)',
    'function getPoolInfo() external view returns (address poolAddress, address token0Address, address token1Address, uint256 totalReserve0, uint256 totalReserve1, uint256 ammReserve0, uint256 ammReserve1, uint256 obAlloc0, uint256 obAlloc1, uint256 lpTotalSupply, uint256 feeBps, bool isPaused, uint256 oraclePrice)',

    // ============ ERC20 ============
    'function balanceOf(address account) external view returns (uint256)',
    'function totalSupply() external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',

    // ============ STRATEGIST FUNCTIONS ============
    'function allocateToOB(uint256 _amount0, uint256 _amount1, bool _isBid) external',
    'function deallocateFromOB(uint256 _amount0, uint256 _amount1) external',
    'function setSwapFee(uint256 _feeBps) external',
    'function pause() external',
    'function unpause() external',

    // ============ STATE ============
    'function strategist() external view returns (address)',
    'function swapFeeBps() external view returns (uint256)',
    'function paused() external view returns (bool)',
    'function obAllocation0() external view returns (uint256)',
    'function obAllocation1() external view returns (uint256)',

    // ============ EVENTS ============
    'event Deposit(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares, address indexed recipient)',
    'event Withdraw(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares, address indexed recipient)',
    'event AllocateToOB(uint256 amount0, uint256 amount1, bool isBid, uint256 timestamp)',
    'event DeallocateFromOB(uint256 amount0, uint256 amount1, uint256 timestamp)',
    'event SwapExecuted(address indexed sender, bool isZeroToOne, uint256 amountIn, uint256 amountOut, uint256 oraclePrice, uint256 effectivePrice)',
] as const;

export const SOVEREIGN_POOL_ABI = [
    'function swap((bool isSwapCallback, bool isZeroToOne, uint256 amountIn, uint256 amountOutMin, uint256 deadline, address recipient, address swapTokenOut, bytes externalContext, bytes verifierContext, bytes swapCallbackContext) params) external returns (uint256 amountInUsed, uint256 amountOut)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint256, uint256)',
    'function sovereignVault() external view returns (address)',
    'function alm() external view returns (address)',
] as const;

export const HYPERCORE_QUOTER_ABI = [
    'function getMidPrice() external view returns (uint256)',
    'function getMidPriceWithInfo() external view returns (uint256 price, bool isFromPrecompile, uint256 age)',
    'function isPrecompileActive() external view returns (bool)',
    'function fallbackPrice() external view returns (uint256)',
    'function lastUpdate() external view returns (uint256)',
    'function updatePrice(uint256 _price) external',
] as const;

export const ERC20_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
] as const;
