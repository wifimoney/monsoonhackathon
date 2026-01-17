import { NextRequest, NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { checkGuardrails, recordExecution } from '@/agent/guardrails';
import { getMarketBySymbol } from '@/agent/market-data';
import type { ActionIntent, GuardrailsConfig } from '@/agent/types';

export async function POST(request: NextRequest) {
    try {
        const { actionIntent, guardrailsConfig } = await request.json() as {
            actionIntent: ActionIntent;
            guardrailsConfig?: GuardrailsConfig;
        };

        if (!actionIntent) {
            return NextResponse.json({ error: 'ActionIntent required' }, { status: 400 });
        }

        // 1. Re-check guardrails (double-check before execution)
        const config: GuardrailsConfig = guardrailsConfig || {
            allowedMarkets: ['GOLD', 'OIL', 'SILVER'],
            maxPerTx: 250,
            cooldownSeconds: 60,
            maxSlippageBps: 100,
        };

        const guardrailsCheck = checkGuardrails(actionIntent, config);
        if (!guardrailsCheck.passed) {
            return NextResponse.json({
                success: false,
                stage: 'local_guardrails',
                error: 'Blocked by local guardrails',
                issues: guardrailsCheck.issues,
                actionIntent,
            }, { status: 400 });
        }

        // 2. Get market info
        const marketSymbol = actionIntent.market.split('/')[0];
        const market = getMarketBySymbol(marketSymbol);

        if (!market) {
            return NextResponse.json({
                success: false,
                stage: 'validation',
                error: `Market ${marketSymbol} not found`,
            }, { status: 400 });
        }

        // 3. Execute via Salt
        try {
            const salt = getSaltClient();

            // Ensure authenticated
            if (!salt.getIsAuthenticated()) {
                await salt.authenticate();
            }

            const accountId = process.env.SALT_ACCOUNT_ID || '696a40b5b0f979ec8ece4482';
            const chainId = Number(process.env.BROADCASTING_NETWORK_ID) || 421614;

            // For hackathon: simulate trade as a transfer
            // In production: call Hyperliquid router contract
            const result = await salt.submitTx({
                accountId,
                chainId,
                to: '0x1111111111111111111111111111111111111111', // Simulated router
                data: `0xdeadbeef${marketSymbol.toLowerCase()}`,
                value: '0',
            });

            // Check for policy denial
            if (result.policyBreach?.denied) {
                return NextResponse.json({
                    success: false,
                    stage: 'salt_policy',
                    denied: true,
                    policyBreach: result.policyBreach,
                    actionIntent,
                }, { status: 403 });
            }

            // Record successful execution (for cooldown tracking)
            recordExecution();

            return NextResponse.json({
                success: true,
                stage: 'confirmed',
                txHash: result.txHash,
                actionIntent,
                receipt: {
                    market: actionIntent.market,
                    side: actionIntent.side,
                    size: actionIntent.notionalUsd,
                    price: market.price,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            // Handle Salt policy denial thrown as exception
            if (error.rejectedPolicies || error.type === 'PolicyDenied') {
                return NextResponse.json({
                    success: false,
                    stage: 'salt_policy',
                    denied: true,
                    policyBreach: {
                        denied: true,
                        rejectedPolicies: error.rejectedPolicies,
                        reason: error.reason || error.message,
                    },
                    actionIntent,
                }, { status: 403 });
            }

            console.error('Execution error:', error);
            return NextResponse.json({
                success: false,
                stage: 'execution',
                error: error.message || 'Execution failed',
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Execute route error:', error);
        return NextResponse.json({
            success: false,
            stage: 'error',
            error: error.message || 'Unknown error',
        }, { status: 500 });
    }
}
