// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IHyperCoreWrite - Interface for HyperEVM Write Precompile
/// @notice Defines expected interface for writing to HyperCore L1 state
/// @dev Precompile address: 0x0000000000000000000000000000000000000801 (Hypothetical)
interface IHyperCoreWrite {
    /// @notice Place a limit order on HyperCore
    /// @param assetIndex The asset index on HyperCore
    /// @param limitPx Limit price in 18 decimal precision
    /// @param sz Size in base asset units (18 decimals)
    /// @param isBuy True for Buy, False for Sell
    /// @param reduceOnly If true, order can only reduce position
    /// @return orderId The ID of the placed order
    function placeOrder(
        uint32 assetIndex, 
        uint64 limitPx, 
        uint64 sz, 
        bool isBuy, 
        bool reduceOnly
    ) external returns (uint64 orderId);
    
    /// @notice Cancel an existing order
    /// @param assetIndex The asset index on HyperCore
    /// @param orderId The ID of the order to cancel
    function cancelOrder(uint32 assetIndex, uint64 orderId) external;
    
    /// @notice Update leverage for an asset
    /// @param assetIndex The asset index on HyperCore
    /// @param leverage The new leverage multiplier
    function updateLeverage(uint32 assetIndex, uint32 leverage) external;
}
