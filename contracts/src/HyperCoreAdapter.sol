// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IHyperCoreWrite.sol";

/// @title HyperCoreAdapter
/// @notice Adapter for interacting with HyperCore L1 Precompiles
/// @dev Features a "Mock Mode" for testing when precompiles are unavailable
contract HyperCoreAdapter is IHyperCoreWrite {
    bool public isLive;
    address public constant PRECOMPILE_ADDRESS = address(0x801); // Hypothetical

    event OrderPlaced(uint32 indexed assetIndex, uint64 limitPx, uint64 sz, bool isBuy, uint64 orderId);
    event OrderCancelled(uint32 indexed assetIndex, uint64 orderId);
    event LeverageUpdated(uint32 indexed assetIndex, uint32 leverage);
    event ModeSwitched(bool isLive);

    constructor(bool _isLive) {
        isLive = _isLive;
    }

    function setMode(bool _isLive) external {
        isLive = _isLive;
        emit ModeSwitched(_isLive);
    }

    function placeOrder(
        uint32 assetIndex, 
        uint64 limitPx, 
        uint64 sz, 
        bool isBuy, 
        bool reduceOnly
    ) external override returns (uint64 orderId) {
        if (!isLive) {
            // Mock Mode: Generate a pseudo-random ID and emit event
            orderId = uint64(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, assetIndex))));
            emit OrderPlaced(assetIndex, limitPx, sz, isBuy, orderId);
            return orderId;
        } else {
            // Live Mode: Low-level call to precompile (Stub)
            // In a real scenario: IHyperCoreWrite(PRECOMPILE_ADDRESS).placeOrder(...)
            revert("HyperCore Precompile unavailable on this network");
        }
    }

    function cancelOrder(uint32 assetIndex, uint64 orderId) external override {
        if (!isLive) {
            emit OrderCancelled(assetIndex, orderId);
        } else {
            revert("HyperCore Precompile unavailable on this network");
        }
    }

    function updateLeverage(uint32 assetIndex, uint32 leverage) external override {
        if (!isLive) {
            emit LeverageUpdated(assetIndex, leverage);
        } else {
            revert("HyperCore Precompile unavailable on this network");
        }
    }
}
