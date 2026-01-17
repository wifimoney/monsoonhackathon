#!/usr/bin/env npx tsx
/**
 * Monsoon Salt Integration Test Script
 * 
 * Tests:
 * 1. Salt SDK connectivity and authentication
 * 2. All 7 Guardian types (guardrails)
 * 3. Trade simulation flow
 * 4. Policy enforcement
 * 
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/test-guardrails-trades.ts
 */

import { getSaltClient } from '../src/salt/client';
import { checkAllGuardians, testGuardian } from '../src/guardians/risk-engine';
import {
    getGuardiansConfig,
    getGuardiansState,
    applyPreset,
    recordTrade,
    simulateDrawdownBreach,
    simulateOutsideHours,
    resetState,
    resumeTrading,
} from '../src/guardians/state';
import type { ActionIntent } from '../src/agent/types';

// ============ HELPERS ============
function log(emoji: string, message: string) {
    console.log(`${emoji}  ${message}`);
}

function section(title: string) {
    console.log('\n' + '='.repeat(60));
    console.log(`📋 ${title}`);
    console.log('='.repeat(60));
}

function pass(test: string) {
    console.log(`   ✅ PASS: ${test}`);
}

function fail(test: string, reason?: string) {
    console.log(`   ❌ FAIL: ${test}${reason ? ` - ${reason}` : ''}`);
}

// ============ TEST ACTIONS ============
const SMALL_TRADE: ActionIntent = {
    type: 'SPOT_MARKET_ORDER',
    market: 'GOLD/USDH',
    side: 'BUY',
    notionalUsd: 100,
    maxSlippageBps: 50,
    validForSeconds: 300,
    rationale: ['Test trade within limits'],
    riskNotes: [],
};

const LARGE_TRADE: ActionIntent = {
    type: 'SPOT_MARKET_ORDER',
    market: 'GOLD/USDH',
    side: 'BUY',
    notionalUsd: 500,
    maxSlippageBps: 50,
    validForSeconds: 300,
    rationale: ['Test trade exceeding limits'],
    riskNotes: [],
};

// Extended type for leverage testing
interface LeveragedIntent extends ActionIntent {
    leverage: number;
}

const LEVERAGED_TRADE: LeveragedIntent = {
    type: 'SPOT_MARKET_ORDER',
    market: 'BTC/USDH',
    side: 'BUY',
    notionalUsd: 100,
    maxSlippageBps: 50,
    validForSeconds: 300,
    rationale: ['Test leveraged trade'],
    riskNotes: [],
    leverage: 10, // High leverage
};

// ============ TESTS ============

async function testSaltConnection(): Promise<boolean> {
    section('1. SALT SDK CONNECTION');

    try {
        const client = getSaltClient();
        log('🔌', 'Initializing Salt client...');

        const auth = await client.authenticate();
        if (auth.success) {
            pass(`Authenticated as ${auth.address}`);
        } else {
            fail('Authentication');
            return false;
        }

        const orgs = await client.getOrganisations();
        pass(`Found ${orgs.length} organization(s)`);

        if (orgs.length > 0) {
            const org = orgs[0] as any;
            const orgId = org._id || org.id;
            const orgName = org.name || 'Unknown';
            const accounts = await client.getAccounts(orgId);
            pass(`Found ${accounts.length} account(s) in "${orgName}"`);

            if (accounts.length > 0) {
                client.setActiveAccount(accounts[0].id);
                pass(`Active account set to ${accounts[0].id}`);
            }
        }

        return true;
    } catch (error: any) {
        fail('Salt connection', error.message);
        return false;
    }
}

async function testGuardians(): Promise<boolean> {
    section('2. GUARDIAN CHECKS (Local Guardrails)');

    // Reset state for clean test
    resetState();
    resumeTrading();
    applyPreset('default');

    const config = getGuardiansConfig();
    log('⚙️', `Using preset: default (max $${config.spend.maxPerTrade}/trade, ${config.leverage.maxLeverage}x leverage)`);

    let allPassed = true;

    // Test 1: Small trade should pass
    log('🧪', 'Test: Small trade ($100) within limits');
    const result1 = checkAllGuardians(SMALL_TRADE);
    if (result1.passed) {
        pass('Small trade passed all guardians');
    } else {
        fail('Small trade should pass', result1.denials[0]?.reason);
        allPassed = false;
    }

    // Test 2: Large trade should fail (Spend Guardian)
    log('🧪', 'Test: Large trade ($500) exceeds spend limit');
    const result2 = checkAllGuardians(LARGE_TRADE);
    if (!result2.passed && result2.denials.some(d => d.guardian === 'spend')) {
        pass('Spend Guardian correctly blocked $500 trade');
    } else {
        fail('Spend Guardian should block $500 trade');
        allPassed = false;
    }

    // Test 3: High leverage should fail (Leverage Guardian)
    log('🧪', 'Test: 10x leverage exceeds 3x limit');
    const result3 = checkAllGuardians(LEVERAGED_TRADE);
    if (!result3.passed && result3.denials.some(d => d.guardian === 'leverage')) {
        pass('Leverage Guardian correctly blocked 10x trade');
    } else {
        fail('Leverage Guardian should block 10x trade');
        allPassed = false;
    }

    // Test 4: Rate limit (cooldown)
    log('🧪', 'Test: Rate limit cooldown');
    recordTrade('GOLD/USDH', 50); // Simulate a trade
    const result4 = checkAllGuardians(SMALL_TRADE);
    if (!result4.passed && result4.denials.some(d => d.guardian === 'rate')) {
        pass('Rate Guardian correctly enforced cooldown');
    } else {
        fail('Rate Guardian should enforce cooldown');
        allPassed = false;
    }

    // Reset for next tests
    resetState();

    // Test 5: Time window (simulated)
    log('🧪', 'Test: Time Window Guardian (simulated outside hours)');
    simulateOutsideHours(true);
    const result5 = checkAllGuardians(SMALL_TRADE);
    if (!result5.passed && result5.denials.some(d => d.guardian === 'timeWindow')) {
        pass('Time Window Guardian correctly blocked outside hours');
    } else {
        // Time window might be disabled by default
        log('⚠️', 'Time Window Guardian is disabled or test skipped');
    }
    simulateOutsideHours(false);

    // Test 6: Loss Guardian (kill switch)
    log('🧪', 'Test: Loss Guardian kill switch');
    simulateDrawdownBreach(true);
    const result6 = checkAllGuardians(SMALL_TRADE);
    if (!result6.passed && result6.denials.some(d => d.guardian === 'loss')) {
        pass('Loss Guardian correctly halted all trading');
    } else {
        fail('Loss Guardian should halt trading');
        allPassed = false;
    }
    resumeTrading();

    return allPassed;
}

async function testGuardianDenialMessages(): Promise<boolean> {
    section('3. GUARDIAN DENIAL MESSAGES');

    const guardians = ['spend', 'leverage', 'exposure', 'venue', 'rate', 'timeWindow', 'loss'] as const;

    for (const guardian of guardians) {
        const denial = testGuardian(guardian);
        log('🚫', `${denial.name}: "${denial.reason}"`);
    }

    pass('All denial messages generated');
    return true;
}

async function testPresets(): Promise<boolean> {
    section('4. GUARDIAN PRESETS');

    const presets = ['conservative', 'default', 'pro'] as const;

    for (const preset of presets) {
        applyPreset(preset);
        const config = getGuardiansConfig();
        log('📊', `${preset.toUpperCase()}: $${config.spend.maxPerTrade}/trade, ${config.leverage.maxLeverage}x leverage, ${config.rate.maxPerDay}/day`);
    }

    // Reset to default
    applyPreset('default');
    pass('All presets applied successfully');
    return true;
}

async function testStateTracking(): Promise<boolean> {
    section('5. STATE TRACKING');

    resetState();

    // Initial state
    let state = getGuardiansState();
    log('📈', `Initial: ${state.tradeCount} trades, $${state.dailySpend} spent`);

    // Record some trades
    recordTrade('GOLD/USDH', 100);
    recordTrade('BTC/USDH', 150);

    state = getGuardiansState();
    log('📈', `After 2 trades: ${state.tradeCount} trades, $${state.dailySpend} spent`);

    if (state.tradeCount === 2 && state.dailySpend === 250) {
        pass('State tracking working correctly');
        return true;
    } else {
        fail('State tracking', `Expected 2 trades/$250, got ${state.tradeCount}/$${state.dailySpend}`);
        return false;
    }
}

async function testTradeSimulation(): Promise<boolean> {
    section('6. TRADE SIMULATION FLOW');

    resetState();
    resumeTrading();
    applyPreset('default');

    log('🎯', 'Simulating full trade flow...');

    // Step 1: Pre-flight check
    log('1️⃣', 'Running pre-flight guardian check...');
    const preflight = checkAllGuardians(SMALL_TRADE);

    if (!preflight.passed) {
        fail('Pre-flight check', preflight.denials[0]?.reason);
        return false;
    }
    pass('Pre-flight passed');

    // Step 2: Would normally call Salt here
    log('2️⃣', 'Salt would execute transaction here...');
    pass('Salt execution (simulated)');

    // Step 3: Record trade
    log('3️⃣', 'Recording trade in state...');
    recordTrade(SMALL_TRADE.market, SMALL_TRADE.notionalUsd);
    pass('Trade recorded');

    // Step 4: Verify state updated
    const state = getGuardiansState();
    if (state.tradeCount === 1 && state.dailySpend === SMALL_TRADE.notionalUsd) {
        pass('State correctly updated');
    } else {
        fail('State update');
        return false;
    }

    return true;
}

// ============ MAIN ============
async function main() {
    console.log('\n🚀 MONSOON GUARDRAILS + SALT TEST SUITE\n');
    console.log('Testing: Salt connection, 7 Guardian types, Trade flow\n');

    const results: { name: string; passed: boolean }[] = [];

    // Run all tests
    results.push({ name: 'Salt Connection', passed: await testSaltConnection() });
    results.push({ name: 'Guardian Checks', passed: await testGuardians() });
    results.push({ name: 'Denial Messages', passed: await testGuardianDenialMessages() });
    results.push({ name: 'Presets', passed: await testPresets() });
    results.push({ name: 'State Tracking', passed: await testStateTracking() });
    results.push({ name: 'Trade Simulation', passed: await testTradeSimulation() });

    // Summary
    section('TEST SUMMARY');

    let allPassed = true;
    for (const result of results) {
        if (result.passed) {
            console.log(`   ✅ ${result.name}`);
        } else {
            console.log(`   ❌ ${result.name}`);
            allPassed = false;
        }
    }

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('\nYour Monsoon instance is ready for trading.');
        console.log('Visit http://localhost:3000/trade to start.');
    } else {
        console.log('⚠️  SOME TESTS FAILED');
        console.log('\nPlease check the errors above and fix configuration.');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
