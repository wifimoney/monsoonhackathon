// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title HyperCoreQuoter - Reads HyperCore L1 orderbook price via precompile
/// @author Monsoon Team
/// @notice Provides price reference from HyperCore for AMM quoting
/// @dev This is the "Hyperliquid-unique" differentiator for the Valantis track
contract HyperCoreQuoter {
    // ============ CONSTANTS ============
    
    /// @notice HyperEVM Read Precompile address
    /// @dev CHECK: Verify actual address from Hyperliquid documentation
    address public constant HYPERCORE_READ = 0x0000000000000000000000000000000000000800;
    
    /// @notice Maximum age for fallback price (5 minutes)
    uint256 public constant MAX_PRICE_AGE = 300;

    // ============ IMMUTABLES ============
    
    /// @notice Asset index on HyperCore (0 = BTC, 1 = ETH, etc.)
    uint32 public immutable assetIndex;

    // ============ STATE ============
    
    /// @notice Fallback price when precompile unavailable
    uint256 public fallbackPrice;
    
    /// @notice Timestamp of last fallback price update
    uint256 public lastUpdate;
    
    /// @notice Admin address (can change updater)
    address public admin;
    
    /// @notice Address authorized to push fallback prices
    address public updater;

    // ============ EVENTS ============
    
    event PriceUpdated(uint256 indexed price, uint256 timestamp, address indexed updater);
    event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    // ============ ERRORS ============
    
    error OnlyAdmin();
    error OnlyUpdater();
    error StalePrice();
    error InvalidPrice();
    error PrecompileFailed();

    // ============ CONSTRUCTOR ============

    /// @notice Deploy the quoter
    /// @param _assetIndex Asset index on HyperCore
    /// @param _initialFallback Initial fallback price (18 decimals)
    /// @param _updater Address authorized to push prices
    constructor(uint32 _assetIndex, uint256 _initialFallback, address _updater) {
        if (_initialFallback == 0) revert InvalidPrice();
        
        assetIndex = _assetIndex;
        fallbackPrice = _initialFallback;
        lastUpdate = block.timestamp;
        admin = msg.sender;
        updater = _updater;
    }

    // ============ MAIN FUNCTIONS ============

    /// @notice Get mid-price from HyperCore L1 orderbook
    /// @dev Tries precompile first, falls back to pushed price
    /// @return price The mid-price in 18 decimal precision
    function getMidPrice() external view returns (uint256 price) {
        // Try HyperCore precompile first
        price = _tryPrecompile();
        if (price > 0) {
            return price;
        }
        
        // Fallback to pushed price
        if (block.timestamp - lastUpdate > MAX_PRICE_AGE) {
            revert StalePrice();
        }
        return fallbackPrice;
    }

    /// @notice Get mid-price with staleness info
    /// @return price The mid-price
    /// @return isFromPrecompile Whether price came from precompile
    /// @return age Age of price in seconds (0 if from precompile)
    function getMidPriceWithInfo() external view returns (
        uint256 price,
        bool isFromPrecompile,
        uint256 age
    ) {
        price = _tryPrecompile();
        if (price > 0) {
            return (price, true, 0);
        }
        
        age = block.timestamp - lastUpdate;
        if (age > MAX_PRICE_AGE) {
            revert StalePrice();
        }
        return (fallbackPrice, false, age);
    }

    /// @notice Check if precompile is working
    /// @return active True if precompile returns valid data
    function isPrecompileActive() external view returns (bool active) {
        return _tryPrecompile() > 0;
    }

    // ============ UPDATER FUNCTIONS ============

    /// @notice Off-chain service pushes price (when precompile unavailable)
    /// @param _price New price (18 decimals)
    function updatePrice(uint256 _price) external {
        if (msg.sender != updater) revert OnlyUpdater();
        if (_price == 0) revert InvalidPrice();
        
        fallbackPrice = _price;
        lastUpdate = block.timestamp;
        
        emit PriceUpdated(_price, block.timestamp, msg.sender);
    }

    /// @notice Batch update for multiple calls efficiency
    /// @param _price New price
    /// @param _timestamp Expected timestamp (for ordering)
    function updatePriceWithTimestamp(uint256 _price, uint256 _timestamp) external {
        if (msg.sender != updater) revert OnlyUpdater();
        if (_price == 0) revert InvalidPrice();
        if (_timestamp <= lastUpdate) return; // Skip stale updates
        
        fallbackPrice = _price;
        lastUpdate = block.timestamp;
        
        emit PriceUpdated(_price, block.timestamp, msg.sender);
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Change the authorized updater
    /// @param _newUpdater New updater address
    function setUpdater(address _newUpdater) external {
        if (msg.sender != admin) revert OnlyAdmin();
        
        emit UpdaterChanged(updater, _newUpdater);
        updater = _newUpdater;
    }

    /// @notice Transfer admin role
    /// @param _newAdmin New admin address
    function setAdmin(address _newAdmin) external {
        if (msg.sender != admin) revert OnlyAdmin();
        
        emit AdminChanged(admin, _newAdmin);
        admin = _newAdmin;
    }

    // ============ INTERNAL ============

    /// @notice Try to read price from precompile
    /// @return price Price from precompile, or 0 if failed
    function _tryPrecompile() internal view returns (uint256 price) {
        // Encode call to precompile
        // Format depends on actual HyperEVM precompile spec
        bytes memory callData = abi.encodeWithSignature(
            "getSpotMid(uint32)",
            assetIndex
        );
        
        (bool success, bytes memory result) = HYPERCORE_READ.staticcall(callData);
        
        if (success && result.length >= 32) {
            price = abi.decode(result, (uint256));
        }
        // Returns 0 if failed
    }
}
