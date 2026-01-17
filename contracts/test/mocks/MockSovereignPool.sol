// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {MonsoonALM} from "../../src/MonsoonALM.sol";

/// @title MockSovereignPool - Mock for testing MonsoonALM
contract MockSovereignPool {
    address public token0;
    address public token1;
    address public alm;
    uint256 public reserve0;
    uint256 public reserve1;
    
    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }
    
    function setALM(address _alm) external {
        alm = _alm;
    }
    
    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }
    
    function depositLiquidity(
        uint256 _amount0,
        uint256 _amount1,
        address,
        bytes calldata,
        bytes calldata _data
    ) external returns (uint256, uint256) {
        // Transfer tokens to pool
        if (_amount0 > 0) {
            IERC20(token0).transferFrom(msg.sender, address(this), _amount0);
        }
        if (_amount1 > 0) {
            IERC20(token1).transferFrom(msg.sender, address(this), _amount1);
        }
        
        reserve0 += _amount0;
        reserve1 += _amount1;
        
        // Callback to ALM
        MonsoonALM(alm).onDepositLiquidityCallback(_amount0, _amount1, _data);
        
        return (_amount0, _amount1);
    }
    
    function withdrawLiquidity(
        uint256 _amount0,
        uint256 _amount1,
        address,
        address _recipient,
        bytes calldata
    ) external returns (uint256, uint256) {
        require(reserve0 >= _amount0, "insufficient reserve0");
        require(reserve1 >= _amount1, "insufficient reserve1");
        
        reserve0 -= _amount0;
        reserve1 -= _amount1;
        
        if (_amount0 > 0) {
            IERC20(token0).transfer(_recipient, _amount0);
        }
        if (_amount1 > 0) {
            IERC20(token1).transfer(_recipient, _amount1);
        }
        
        return (_amount0, _amount1);
    }
    
    // Helper to simulate swaps
    function simulateSwap(bool isZeroToOne, uint256 amountIn, uint256 amountOut) external {
        if (isZeroToOne) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }
        
        MonsoonALM(alm).onSwapCallback(isZeroToOne, amountIn, amountOut);
    }
}
