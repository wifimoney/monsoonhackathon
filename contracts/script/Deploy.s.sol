// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MonsoonALM.sol";
import "../src/HyperCoreQuoter.sol";

// Valantis interfaces
interface IProtocolFactory {
    function deploySovereignPool(
        bytes32 _poolKey,
        address _token0,
        address _token1,
        address _poolManager,
        address _sovereignVault,
        address _verifierModule,
        bool _isToken0Rebase,
        bool _isToken1Rebase
    ) external returns (address pool);
}

interface ISovereignPoolFactory {
    function deploy(bytes32 _poolKey, SovereignPoolConstructorArgs memory _args) external returns (address);
}

struct SovereignPoolConstructorArgs {
    address token0;
    address token1;
    address protocolFactory;
    address poolManager;
    address sovereignVault;
    address verifierModule;
    bool isToken0Rebase;
    bool isToken1Rebase;
}

import {ISovereignPool} from "valantis-core/pools/interfaces/ISovereignPool.sol";

contract DeployMonsoon is Script {
    // ============ HYPEREVM ADDRESSES ============
    
    // ============ DEPLOYMENT ============

    function run() external {
        // Load config
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address strategist = vm.envAddress("STRATEGIST");
        address priceUpdater = vm.envAddress("PRICE_UPDATER");
        address token0 = vm.envAddress("TOKEN0");
        address token1 = vm.envAddress("TOKEN1");

        // Load Factories (Default to HyperEVM)
        address protocolFactory = vm.envOr("PROTOCOL_FACTORY", 0x7E028ac56cB2AF75292F3D967978189698C24732);
        address poolFactory = vm.envOr("POOL_FACTORY", 0xe105af173402b07100aE5648385E1F182bCE21B6);
        
        // Validate token ordering
        require(token0 < token1, "token0 must be < token1");

        console.log("=== MONSOON DEPLOYMENT ===");
        console.log("Network: ", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Strategist:", strategist);
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        console.log("Protocol Factory:", protocolFactory);
        console.log("Pool Factory:", poolFactory);
        console.log("");

        vm.startBroadcast(deployerKey);

        // ============ STEP 1: Deploy HyperCore Quoter ============
        console.log("1. Deploying HyperCoreQuoter...");
        
        HyperCoreQuoter quoter = new HyperCoreQuoter(
            0,              // assetIndex (0 for HYPE, check HyperCore docs)
            2000e18,        // fallback price ($2000)
            priceUpdater
        );
        console.log("   Quoter:", address(quoter));

        // ============ STEP 2: Deploy Sovereign Pool ============
        console.log("2. Deploying Sovereign Pool...");
        
        bytes32 poolKey = keccak256(abi.encode(
            "MONSOON",
            token0,
            token1,
            block.timestamp
        ));
        
        SovereignPoolConstructorArgs memory poolArgs = SovereignPoolConstructorArgs({
            token0: token0,
            token1: token1,
            protocolFactory: protocolFactory,
            poolManager: deployer,    // Temporary, will transfer
            sovereignVault: address(0), // Use pool as vault
            verifierModule: address(0), // Permissionless
            isToken0Rebase: false,
            isToken1Rebase: false
        });

        address pool = ISovereignPoolFactory(poolFactory).deploy(poolKey, poolArgs);
        console.log("   Sovereign Pool:", pool);

        // ============ STEP 3: Deploy MonsoonALM ============
        console.log("3. Deploying MonsoonALM...");
        
        MonsoonALM alm = new MonsoonALM(
            pool,
            address(quoter),
            strategist
        );
        console.log("   MonsoonALM:", address(alm));

        // ============ STEP 4: Configure Pool ============
        console.log("4. Configuring pool...");
        
        // Set ALM on pool
        ISovereignPool(pool).setALM(address(alm));
        console.log("   ALM set on pool");
        
        // Transfer pool manager to ALM (makes pool immutable to external changes)
        // ISovereignPool(pool).setPoolManager(address(alm));
        // console.log("   Pool manager transferred to ALM");

        vm.stopBroadcast();

        // ============ OUTPUT ============
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("");
        console.log("Copy these to your frontend config:");
        console.log("-----------------------------------");
        console.log("HYPERCORE_QUOTER=", address(quoter));
        console.log("SOVEREIGN_POOL=", pool);
        console.log("MONSOON_ALM=", address(alm));
        console.log("-----------------------------------");
        console.log("");
        console.log("Next steps:");
        console.log("1. Fund the pool with initial liquidity");
        console.log("2. Start the price updater service");
        console.log("3. Start the OB executor service");
    }
}
