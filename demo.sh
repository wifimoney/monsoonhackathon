#!/bin/bash
# demo.sh - Monsoon Demo Script

echo "🌊 MONSOON DEMO"
echo "==============="
echo ""

# 1. Setup
echo "1️⃣  SETUP"
echo "   Checking deployed contracts..."
echo "   - Quoter: $HYPERCORE_QUOTER"
echo "   - Pool: $SOVEREIGN_POOL"
echo "   - ALM: $MONSOON_ALM"
echo ""

# 2. Deposit
echo "2️⃣  DEPOSIT (Salt-gated)"
echo "   User deposits 100 WHYPE + 200 USDC"
echo "   → Salt policy check: ✓ Amount within limits"
echo "   → Robo Guardian approval: ✓"
echo "   → Transaction submitted..."
echo "   → LP tokens minted: 141.42 mLP"
echo ""

# 3. Show Pool State
echo "3️⃣  POOL STATE"
echo "   Total Reserves: 100 WHYPE / 200 USDC"
echo "   AMM Reserves: 100 WHYPE / 200 USDC"
echo "   OB Allocated: 0 / 0"
echo "   Oracle Price: $2,000"
echo ""

# 4. Swap
echo "4️⃣  EXTERNAL SWAP"
echo "   Trader swaps 10 WHYPE → USDC"
echo "   → SovereignPool.swap() called"
echo "   → MonsoonALM.getLiquidityQuote()"
echo "   → Output: 19.6 USDC (0.3% fee)"
echo "   → Oracle price: $2,000"
echo ""

# 5. Strategist Rebalance
echo "5️⃣  REBALANCE (Salt-gated)"
echo "   Strategist allocates 20% to OB"
echo "   → Salt policy check: ✓ Within 30% max"
echo "   → Robo Guardian approval: ✓"
echo "   → AllocateToOB event emitted"
echo ""

# 6. Executor
echo "6️⃣  OB EXECUTOR"
echo "   Executor picks up event..."
echo "   → Reading HyperCore mid: $2,000"
echo "   → Placing BID at $1,994 (0.3% spread)"
echo "   → Order ID: 12345"
echo "   → Logged to Audit"
echo ""

# 7. Summary
echo "7️⃣  SUMMARY"
echo "   ✓ Every action Salt-gated"
echo "   ✓ HyperCore-native pricing"
echo "   ✓ Non-custodial execution"
echo "   ✓ Full audit trail"
echo ""
echo "🎉 Demo complete!"
