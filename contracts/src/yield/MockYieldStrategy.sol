// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "openzeppelin/token/ERC20/ERC20.sol";
import "../interfaces/IYieldStrategy.sol";

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

/// @title MockYieldStrategy
/// @notice Simulates earning yield on deposited assets
contract MockYieldStrategy is ERC20, IYieldStrategy {
    using SafeERC20 for IERC20;

    address public override token;

    constructor(address _token) ERC20("Mock Yield Share", "mYSH") {
        token = _token;
    }

    function deposit(uint256 amount) external override returns (uint256 shares) {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 total = totalAssets();
        uint256 supply = totalSupply();
        
        if (total == 0 || supply == 0) {
            shares = amount;
        } else {
            shares = (amount * supply) / total;
        }
        
        _mint(msg.sender, shares);
    }
    
    function withdraw(uint256 shares) external override returns (uint256 amount) {
        uint256 supply = totalSupply();
        uint256 total = totalAssets();
        
        if (supply == 0) return 0;
        
        amount = (shares * total) / supply;
        
        _burn(msg.sender, shares);
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    function totalAssets() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function getBalance() external view override returns (uint256) {
        // Value of holdings is strictly token balance
        // If we want to simulate yield, we usually need to increase this balance via airdrop/mint
        return totalAssets();
    }
    
    /// @notice Simulate yield by minting new tokens to this contract
    function accrueInterest(uint256 bps) external {
        uint256 interest = (totalAssets() * bps) / 10000;
        if (interest > 0) {
            try IMockERC20(token).mint(address(this), interest) {
                // Yield accrued
            } catch {
                // Failed to mint, mock token might not support it
            }
        }
    }
}
