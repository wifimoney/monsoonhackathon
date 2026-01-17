
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3003/api';

const SUCCESS_INTENT = {
    type: 'SPOT_BUY',
    market: 'ETH/USD',
    amount: 0.001,
    notionalUsd: 2, // Small amount
    rationale: ['Test trade'],
    riskNotes: ['None']
};

const HUGE_INTENT = {
    type: 'SPOT_BUY',
    market: 'ETH/USD',
    amount: 1000,
    notionalUsd: 2000000, // Huge amount
    rationale: ['Big trade'],
    riskNotes: ['High risk']
};

const STRICT_CONFIG = {
    spend: {
        enabled: true,
        maxPerTrade: 10,
        maxDaily: 100,
    },
    timeWindow: { enabled: false, startHour: 0, endHour: 24 },
    loss: { enabled: false, maxDrawdown: 1000 },
    venue: { enabled: false, allowedContracts: [] },
    rate: { enabled: false, cooldownSeconds: 0 },
};

async function runTests() {
    console.log('Starting Salt API Tests...');
    console.log(`Targeting: ${BASE_URL}`);

    // Helper to delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Wait for server to potentially wake up (Next.js is slow to compile first time)
    console.log('Waiting 2s for server to be ready...');
    await delay(2000);

    // Test 0: Get & Set Accounts
    console.log('\n--- Test 0: Get & Set Accounts ---');
    let accountId = '';
    try {
        const res = await fetch(`${BASE_URL}/salt/accounts`);
        const data: any = await res.json();
        console.log('GET /accounts Status:', res.status);
        if (res.status === 200 && data.accounts?.length > 0) {
            console.log(`Found ${data.accounts.length} accounts.`);
            accountId = data.accounts[0].id;
            console.log('Selected Account ID:', accountId);

            // Set Active
            const resPost = await fetch(`${BASE_URL}/salt/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });
            const dataPost: any = await resPost.json();
            console.log('POST /accounts Status:', resPost.status);
            console.log('Active Account Set:', dataPost.success);
        } else {
            console.log('No accounts found or error:', data);
        }
    } catch (e: any) { console.error('Account test failed:', e.message); }

    // Test 1: Simulate Success
    console.log('\n--- Test 1: Simulate Success (Expect Passed) ---');
    try {
        const res = await fetch(`${BASE_URL}/salt/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actionIntent: SUCCESS_INTENT,
                guardrailsConfig: STRICT_CONFIG // 2 < 10, should pass
            })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Full Response:', JSON.stringify(data, null, 2));
    } catch (e: any) { console.error('Request failed:', e.message); }

    // Test 2: Simulate Failure (Spend)
    console.log('\n--- Test 2: Simulate Failure (Expect Blocked by Spend Guardian) ---');
    try {
        const res = await fetch(`${BASE_URL}/salt/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actionIntent: HUGE_INTENT, // 2M > 10
                guardrailsConfig: STRICT_CONFIG
            })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Full Response:', JSON.stringify(data, null, 2));
    } catch (e: any) { console.error('Request failed:', e.message); }

    // Test 3: Execute Failure (Local Guardian)
    console.log('\n--- Test 3: Execute Failure (Expect 400 - Blocked by Local Guardian) ---');
    try {
        const res = await fetch(`${BASE_URL}/chat/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actionIntent: HUGE_INTENT,
                guardrailsConfig: STRICT_CONFIG
            })
        });
        const data: any = await res.json();
        console.log('Status:', res.status);
        if (res.status !== 400) {
            console.log('Response:', JSON.stringify(data, null, 2));
        } else {
            console.log('Error Message:', data.error);
            console.log('Issues:', data.issues);
        }
    } catch (e: any) { console.error('Request failed:', e.message); }

    // Test 4: Execute "Success" (Attempt)
    console.log('\n--- Test 4: Execute Attempt (Expect Salt/Auth Error but Local Pass) ---');
    try {
        const res = await fetch(`${BASE_URL}/chat/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actionIntent: SUCCESS_INTENT,
                guardrailsConfig: STRICT_CONFIG
            })
        });
        const data: any = await res.json();
        console.log('Status:', res.status);
        if (res.status === 200) {
            console.log('Success! TxHash:', data.txHash);
        } else {
            console.log('Stage:', data.stage);
            console.log('Error:', data.error);
            // Log full response if it's not a simple error
            if (data.policyBreach) console.log('Policy Breach:', data.policyBreach);
        }
    } catch (e: any) { console.error('Request failed:', e.message); }

    console.log('\nTests completed.');
}

runTests();
