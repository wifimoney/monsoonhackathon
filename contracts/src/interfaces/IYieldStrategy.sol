// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IYieldStrategy {
    /// @notice Deposit underlying asset
    function deposit(uint256 amount) external returns (uint256 shares);
    
    /// @notice Withdraw underlying asset
    function withdraw(uint256 shares) external returns (uint256 amount);
    
    /// @notice Get total value of strategy holdings in underlying asset
    function getBalance() external view returns (uint256);
    
    /// @notice Underlying token address
    function token() external view returns (address);
}
