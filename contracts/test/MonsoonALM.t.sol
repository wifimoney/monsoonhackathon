// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MonsoonALM.sol";
import "../src/HyperCoreQuoter.sol";
import "./mocks/MockSovereignPool.sol";
import "./mocks/MockERC20.sol";

contract MonsoonALMTest is Test {
    MonsoonALM public alm;
    HyperCoreQuoter public quoter;
    MockSovereignPool public pool;
    MockERC20 public token0;
    MockERC20 public token1;
    
    address public strategist = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public priceUpdater = address(0x4);

    uint256 constant INITIAL_BALANCE = 1_000_000e18;

    function setUp() public {
        // Deploy mock tokens (ensure token0 < token1)
        token0 = new MockERC20("Token A", "TKA", 18);
        token1 = new MockERC20("Token B", "TKB", 18);
        
        if (address(token0) > address(token1)) {
            (token0, token1) = (token1, token0);
        }
        
        // Deploy mock pool
        pool = new MockSovereignPool(address(token0), address(token1));
        
        // Deploy quoter with mock price ($2000)
        quoter = new HyperCoreQuoter(0, 2000e18, priceUpdater);
        
        // Deploy ALM
        alm = new MonsoonALM(address(pool), address(quoter), strategist);
        
        // Set ALM on pool
        pool.setALM(address(alm));
        
        // Setup users
        _setupUser(user1);
        _setupUser(user2);
    }

    function _setupUser(address user) internal {
        token0.mint(user, INITIAL_BALANCE);
        token1.mint(user, INITIAL_BALANCE);
        
        vm.startPrank(user);
        token0.approve(address(alm), type(uint256).max);
        token1.approve(address(alm), type(uint256).max);
        vm.stopPrank();
    }

    // ============ DEPOSIT TESTS ============

    function testDeposit() public {
        uint256 amount0 = 100e18;
        uint256 amount1 = 100e18;
        
        vm.prank(user1);
        uint256 shares = alm.deposit(amount0, amount1, 0, user1);
        
        assertGt(shares, 0, "Should receive LP tokens");
        assertEq(alm.balanceOf(user1), shares, "Balance should match");
        assertEq(pool.reserve0(), amount0, "Pool should have token0");
        assertEq(pool.reserve1(), amount1, "Pool should have token1");
    }

    function testDepositMinimumLiquidity() public {
        uint256 amount0 = 100e18;
        uint256 amount1 = 100e18;
        
        vm.prank(user1);
        alm.deposit(amount0, amount1, 0, user1);
        
        // Check minimum liquidity is locked
        assertEq(alm.balanceOf(address(0xdead)), alm.MINIMUM_LIQUIDITY());
    }

    function testDepositSecondUser() public {
        // First deposit
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        // Second deposit
        vm.prank(user2);
        uint256 shares = alm.deposit(50e18, 50e18, 0, user2);
        
        // Should get proportional shares
        assertGt(shares, 0);
        // User2 deposited half, should get ~half the shares (minus initial minimum)
    }

    function testDepositZeroReverts() public {
        vm.prank(user1);
        vm.expectRevert(MonsoonALM.InvalidAmount.selector);
        alm.deposit(0, 0, 0, user1);
    }

    function testDepositSlippageReverts() public {
        vm.prank(user1);
        vm.expectRevert(MonsoonALM.SlippageExceeded.selector);
        alm.deposit(100e18, 100e18, type(uint256).max, user1);
    }

    // ============ WITHDRAW TESTS ============

    function testWithdraw() public {
        // Deposit first
        vm.prank(user1);
        uint256 shares = alm.deposit(100e18, 100e18, 0, user1);
        
        uint256 balanceBefore0 = token0.balanceOf(user1);
        uint256 balanceBefore1 = token1.balanceOf(user1);
        
        // Withdraw
        vm.prank(user1);
        (uint256 amount0, uint256 amount1) = alm.withdraw(shares, 0, 0, user1);
        
        assertGt(amount0, 0, "Should receive token0");
        assertGt(amount1, 0, "Should receive token1");
        assertEq(alm.balanceOf(user1), 0, "Should have no LP tokens");
        assertEq(token0.balanceOf(user1), balanceBefore0 + amount0);
        assertEq(token1.balanceOf(user1), balanceBefore1 + amount1);
    }

    function testWithdrawPartial() public {
        vm.prank(user1);
        uint256 shares = alm.deposit(100e18, 100e18, 0, user1);
        
        // Withdraw half
        vm.prank(user1);
        alm.withdraw(shares / 2, 0, 0, user1);
        
        assertGt(alm.balanceOf(user1), 0, "Should have remaining LP tokens");
    }

    // ============ QUOTE TESTS ============

    function testGetAmountOut() public {
        // Setup liquidity
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        // Get quote
        (uint256 amountOut, uint256 oraclePrice, uint256 priceImpact) = alm.getAmountOut(true, 10e18);
        
        assertGt(amountOut, 0, "Should get output");
        assertEq(oraclePrice, 2000e18, "Should return oracle price");
        assertGt(priceImpact, 0, "Should have some price impact");
    }

    function testGetAmountOutNoLiquidity() public {
        (uint256 amountOut,,) = alm.getAmountOut(true, 10e18);
        assertEq(amountOut, 0, "Should return 0 with no liquidity");
    }

    // ============ STRATEGIST TESTS ============

    function testAllocateToOB() public {
        // Setup liquidity
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        // Allocate to OB
        vm.prank(strategist);
        vm.expectEmit(true, true, true, true);
        emit MonsoonALM.AllocateToOB(0, 20e18, true, block.timestamp);
        alm.allocateToOB(0, 20e18, true);
        
        // Check reserves reduced
        (uint256 ammR0, uint256 ammR1) = alm.getAMMReserves();
        assertEq(ammR0, 100e18, "AMM reserve0 unchanged");
        assertEq(ammR1, 80e18, "AMM reserve1 reduced");
    }

    function testAllocateToOBInsufficientReverts() public {
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        vm.prank(strategist);
        vm.expectRevert(MonsoonALM.InsufficientLiquidity.selector);
        alm.allocateToOB(0, 200e18, true); // More than available
    }

    function testOnlyStrategistCanAllocate() public {
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        vm.prank(user1); // Not strategist
        vm.expectRevert(MonsoonALM.OnlyStrategist.selector);
        alm.allocateToOB(0, 20e18, true);
    }

    function testDeallocateFromOB() public {
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        vm.prank(strategist);
        alm.allocateToOB(0, 20e18, true);
        
        vm.prank(strategist);
        alm.deallocateFromOB(0, 20e18);
        
        (uint256 ammR0, uint256 ammR1) = alm.getAMMReserves();
        assertEq(ammR1, 100e18, "Should be back to full");
    }

    function testSetSwapFee() public {
        vm.prank(strategist);
        alm.setSwapFee(50); // 0.5%
        
        assertEq(alm.swapFeeBps(), 50);
    }

    function testSetSwapFeeTooHighReverts() public {
        vm.prank(strategist);
        vm.expectRevert(MonsoonALM.FeeTooHigh.selector);
        alm.setSwapFee(200); // 2% > max 1%
    }

    // ============ PAUSE TESTS ============

    function testPause() public {
        vm.prank(strategist);
        alm.pause();
        
        assertTrue(alm.paused());
        
        vm.prank(user1);
        vm.expectRevert(MonsoonALM.ContractPaused.selector);
        alm.deposit(100e18, 100e18, 0, user1);
    }

    function testUnpause() public {
        vm.prank(strategist);
        alm.pause();
        
        vm.prank(strategist);
        alm.unpause();
        
        assertFalse(alm.paused());
    }

    // ============ VIEW TESTS ============

    function testGetPoolInfo() public {
        vm.prank(user1);
        alm.deposit(100e18, 100e18, 0, user1);
        
        (
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
        ) = alm.getPoolInfo();
        
        assertEq(poolAddress, address(pool));
        assertEq(token0Address, address(token0));
        assertEq(token1Address, address(token1));
        assertEq(totalReserve0, 100e18);
        assertEq(totalReserve1, 100e18);
        assertEq(ammReserve0, 100e18);
        assertEq(ammReserve1, 100e18);
        assertEq(obAlloc0, 0);
        assertEq(obAlloc1, 0);
        assertGt(lpTotalSupply, 0);
        assertEq(feeBps, 30);
        assertFalse(isPaused);
        assertEq(oraclePrice, 2000e18);
    }
}
