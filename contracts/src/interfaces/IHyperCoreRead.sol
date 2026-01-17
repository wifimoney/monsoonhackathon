// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IHyperCoreRead - Interface for HyperEVM Read Precompile
/// @notice Defines expected interface for reading HyperCore L1 state
/// @dev Precompile address: 0x0000000000000000000000000000000000000800
interface IHyperCoreRead {
    /// @notice Get spot mid-price for an asset
    /// @param assetIndex The asset index on HyperCore (0=BTC, 1=ETH, etc.)
    /// @return price The mid-price in 18 decimal precision
    function getSpotMid(uint32 assetIndex) external view returns (uint256 price);
    
    /// @notice Get oracle price for an asset
    /// @param assetIndex The asset index on HyperCore
    /// @return price The oracle price in 18 decimal precision
    function getOraclePrice(uint32 assetIndex) external view returns (uint256 price);
    
    /// @notice Get best bid/ask for an asset
    /// @param assetIndex The asset index on HyperCore
    /// @return bestBid Best bid price
    /// @return bestAsk Best ask price
    function getBBO(uint32 assetIndex) external view returns (uint256 bestBid, uint256 bestAsk);
}
