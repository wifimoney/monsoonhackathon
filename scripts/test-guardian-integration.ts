// Scripts/test-guardian-integration.ts
// Quick sanity check script to verify GuardianService logic in isolation
require('tsconfig-paths/register');
import { GuardianService } from '../src/lib/guardian-service';

async function runTest() {
    console.log("=== Testing Guardian Service Middleware ===");

    // Test Case 1: Permitted Trade
    const validTrade = {
        symbol: "ETH-PERP",
        size: 100, // $100 < $250 max
        side: "BUY" as const
    };

    console.log(`\nTest 1: Valid Trade ($${validTrade.size})`);
    const res1 = await GuardianService.validateTradeRequest(validTrade);
    console.log("Result:", res1.success ? "✅ PASS" : "❌ FAIL");
    if (!res1.success) console.log("Reason:", res1.reason);

    // Test Case 2: Excessive Spend
    const bigTrade = {
        symbol: "ETH-PERP",
        size: 500, // $500 > $250 max (Default preset)
        side: "SELL" as const
    };

    console.log(`\nTest 2: Excessive Spend Trade ($${bigTrade.size})`);
    const res2 = await GuardianService.validateTradeRequest(bigTrade);
    console.log("Result:", !res2.success ? "✅ BLOCKED (Correct)" : "❌ FAILED TO BLOCK");
    if (!res2.success) console.log("Reason:", res2.reason);

}

runTest().catch(console.error);
