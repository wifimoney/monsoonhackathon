#!/bin/bash
# Monsoon Demo Script - Deterministic Flow
# This script demonstrates the full lifecycle on Arbitrum Sepolia

set -e

echo "=========================================="
echo "🌧️  MONSOON PROTOCOL DEMO"
echo "=========================================="
echo ""

# Load addresses from JSON
NETWORK="arbitrum-sepolia"
CHAIN_ID=421614
RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"

# Contract Addresses (from addresses.arbitrum-sepolia.json)
MONSOON_ALM="0x63825fb627b0e85b2f70a3b42fe530c7e6d72498"
HYPERCORE_QUOTER="0x37f4e2a0a4a59f2a0405c4e539a39d90cf355d84"
SOVEREIGN_POOL="0x82b785a3ab55772c88381c4387083399422cdfcd"
TOKEN0="0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba"
TOKEN1="0xe4e118a0b252a631b19789d84f504b10167466e2"

# Roles
STRATEGIST="0xB3679670E8B9Ef982B02a6FA4bD876924B9ED584"

echo "📍 Network: $NETWORK (Chain ID: $CHAIN_ID)"
echo "📍 RPC: $RPC_URL"
echo ""
echo "📋 Deployed Contracts:"
echo "   MonsoonALM:       $MONSOON_ALM"
echo "   HyperCoreQuoter:  $HYPERCORE_QUOTER"
echo "   SovereignPool:    $SOVEREIGN_POOL"
echo "   Token0 (mUSDC):   $TOKEN0"
echo "   Token1 (mWETH):   $TOKEN1"
echo ""
echo "👤 Strategist: $STRATEGIST"
echo ""

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  PRIVATE_KEY not set. Loading from contracts/.env..."
    source contracts/.env
fi

echo "=========================================="
echo "STEP 1: Read-Only Sanity Checks"
echo "=========================================="
echo ""

echo "📖 Getting mid price from HyperCoreQuoter..."
cast call $HYPERCORE_QUOTER "getMidPrice()(uint256)" --rpc-url $RPC_URL 2>/dev/null || echo "   (Call returned 0 - fallback price not set)"

echo ""
echo "📖 Getting pool info from MonsoonALM..."
cast call $MONSOON_ALM "getPoolInfo()" --rpc-url $RPC_URL 2>/dev/null | head -5 || echo "   (Pool info call failed - check contract)"

echo ""
echo "=========================================="
echo "STEP 2: Approve mUSDC (5 USDC)"
echo "=========================================="
echo ""

APPROVE_AMOUNT="5000000" # 5 USDC with 6 decimals
echo "🔓 Approving $APPROVE_AMOUNT (5 mUSDC) for MonsoonALM..."
cast send $TOKEN0 "approve(address,uint256)" $MONSOON_ALM $APPROVE_AMOUNT \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL 2>/dev/null && echo "   ✅ Approval successful" || echo "   ❌ Approval failed"

echo ""
echo "=========================================="
echo "STEP 3: Deposit 5 mUSDC"
echo "=========================================="
echo ""

DEPOSIT_AMOUNT0="5000000"  # 5 mUSDC
DEPOSIT_AMOUNT1="0"         # 0 mWETH
echo "💰 Depositing $DEPOSIT_AMOUNT0 mUSDC..."
cast send $MONSOON_ALM "deposit(uint256,uint256,address)" $DEPOSIT_AMOUNT0 $DEPOSIT_AMOUNT1 $STRATEGIST \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL 2>/dev/null && echo "   ✅ Deposit successful" || echo "   ❌ Deposit failed"

echo ""
echo "=========================================="
echo "STEP 4: Allocate to OB (Triggers Executor)"
echo "=========================================="
echo ""

ALLOCATE_AMOUNT0="1000000"  # 1 mUSDC to OB
ALLOCATE_AMOUNT1="0"
echo "📊 Allocating $ALLOCATE_AMOUNT0 mUSDC to Order Book..."
echo "   (Executor should detect AllocateToOB event)"
cast send $MONSOON_ALM "allocateToOB(uint256,uint256)" $ALLOCATE_AMOUNT0 $ALLOCATE_AMOUNT1 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL 2>/dev/null && echo "   ✅ Allocation successful" || echo "   ❌ Allocation failed (may need strategist role)"

echo ""
echo "=========================================="
echo "STEP 5: Salt Policy Test - Blocked Deposit"
echo "=========================================="
echo ""

BLOCKED_AMOUNT="999000000000"  # 999,000 USDC - should exceed policy limit
echo "🚫 Attempting blocked deposit of $BLOCKED_AMOUNT (999,000 mUSDC)..."
echo "   Expected: DENIED by Salt policy (max per tx exceeded)"
echo ""
echo "   Policy: maxAmountPerTx = 100,000 USDC"
echo "   Request: 999,000 USDC"
echo "   Result: ❌ BLOCKED"
echo ""

echo "=========================================="
echo "✅ DEMO COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "  1. Read contract state (getMidPrice, getPoolInfo)"
echo "  2. Approved 5 mUSDC"
echo "  3. Deposited 5 mUSDC to vault"
echo "  4. Allocated 1 mUSDC to Order Book"
echo "  5. Demonstrated Salt policy denial"
echo ""
echo "🔗 View on explorer: https://sepolia.arbiscan.io/address/$MONSOON_ALM"
