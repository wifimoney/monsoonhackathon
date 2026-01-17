// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../test/mocks/MockERC20.sol";
import "../test/mocks/MockSovereignPool.sol";
import "../src/MonsoonALM.sol";
import "../src/HyperCoreQuoter.sol";

import {DeployMonsoon, SovereignPoolConstructorArgs} from "./Deploy.s.sol";

contract MockFactory {
    function deploySovereignPool(
        bytes32,
        address,
        address,
        address,
        address,
        address,
        bool,
        bool
    ) external returns (address) {
        return address(new MockSovereignPool(address(0), address(0)));
    }
    
    function deploy(bytes32, SovereignPoolConstructorArgs memory args) external returns (address) {
        return address(new MockSovereignPool(args.token0, args.token1));
    }
}

contract DeployMocksAndMonsoon is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== ARBITRUM SEPOLIA MOCK DEPLOYMENT ===");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // 1. Deploy Mock Tokens
        MockERC20 tokenA = new MockERC20("Mock USDC", "mUSDC", 6);
        MockERC20 tokenB = new MockERC20("Mock WETH", "mWETH", 18);
        
        (address token0, address token1) = address(tokenA) < address(tokenB) 
            ? (address(tokenA), address(tokenB)) 
            : (address(tokenB), address(tokenA));
            
        console.log("Token0:", token0);
        console.log("Token1:", token1);

        // 2. Deploy Mock Factories
        MockFactory factory = new MockFactory();
        console.log("Mock Factory:", address(factory));

        // 3. Deploy Quoter
        HyperCoreQuoter quoter = new HyperCoreQuoter(
            0,
            2000e18,
            deployer // Deployer is updater for testnet
        );
        console.log("Quoter:", address(quoter));

        // 4. Deploy Pool (via Mock Factory)
        MockSovereignPool pool = new MockSovereignPool(token0, token1);
        console.log("Mock Pool:", address(pool));

        // 5. Deploy ALM
        MonsoonALM alm = new MonsoonALM(
            address(pool),
            address(quoter),
            deployer // Deployer is strategist for testnet
        );
        console.log("MonsoonALM:", address(alm));

        // 6. Setup Mocks
        pool.setALM(address(alm));
        
        // Mint tokens to deployer
        MockERC20(token0).mint(deployer, 1_000_000 * 10**MockERC20(token0).decimals());
        MockERC20(token1).mint(deployer, 1_000 * 10**MockERC20(token1).decimals());

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("HYPERCORE_QUOTER=", address(quoter));
        console.log("SOVEREIGN_POOL=", address(pool));
        console.log("MONSOON_ALM=", address(alm));
        console.log("TOKEN0=", token0);
        console.log("TOKEN1=", token1);
    }
}
