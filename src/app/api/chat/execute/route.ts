import { NextRequest, NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { checkGuardrails, recordExecution } from '@/agent/guardrails';
import { getMarketBySymbol } from '@/agent/market-data';
import { recordAudit } from '@/audit/store';
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
            recordAudit({
                actionType: 'chat_trade',
                status: 'denied',
                market: 'market' in actionIntent ? actionIntent.market : undefined,
                notionalUsd: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                reason: 'Blocked by local guardrails',
                intent: actionIntent,
                metadata: { issues: guardrailsCheck.issues },
            });
            return NextResponse.json({
                success: false,
                stage: 'local_guardrails',
                error: 'Blocked by local guardrails',
                issues: guardrailsCheck.issues,
                actionIntent,
            }, { status: 400 });
        }

        // 2. Get market info (only for market actions)
        let marketSymbol: string | undefined;
        let market: any;

        if ('market' in actionIntent) {
            marketSymbol = actionIntent.market.split('/')[0];
            market = getMarketBySymbol(marketSymbol);

            if (!market) {
                return NextResponse.json({
                    success: false,
                    stage: 'validation',
                    error: `Market ${marketSymbol} not found`,
                }, { status: 400 });
            }
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

            // Prepare transaction params
            let txParams: any = {
                accountId,
                chainId,
            };

            if ('market' in actionIntent) {
                txParams = {
                    ...txParams,
                    to: '0x1111111111111111111111111111111111111111', // Simulated router
                    data: `0xdeadbeef${(marketSymbol || '').toLowerCase()}`,
                    value: '0',
                };
            } else if (actionIntent.type === 'TRANSFER') {
                // Handle transfer
                txParams = {
                    ...txParams,
                    to: actionIntent.to,
                    data: '0x',
                    value: '0', // In real app would be amount converted to wei
                };
            }

            const result = await salt.submitTx(txParams);

            // Check for policy denial
            if (result.policyBreach?.denied) {
                recordAudit({
                    actionType: 'chat_trade',
                    status: 'denied',
                    market: 'market' in actionIntent ? actionIntent.market : undefined,
                    notionalUsd: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                    reason: result.policyBreach.reason,
                    policies: (result.policyBreach as { rejectedPolicies?: Array<{ name: string }> })
                        .rejectedPolicies
                        ?.map((p) => p.name),
                    intent: actionIntent,
                });
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
            recordAudit({
                actionType: 'chat_trade',
                status: 'confirmed',
                market: 'market' in actionIntent ? actionIntent.market : undefined,
                notionalUsd: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                txHash: result.txHash,
                intent: actionIntent,
            });

            return NextResponse.json({
                success: true,
                stage: 'confirmed',
                txHash: result.txHash,
                actionIntent,
                receipt: {
                    market: 'market' in actionIntent ? actionIntent.market : 'N/A',
                    side: 'side' in actionIntent ? actionIntent.side : undefined,
                    size: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                    price: market?.price,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            // Handle Salt policy denial thrown as exception
            if (error.rejectedPolicies || error.type === 'PolicyDenied') {
                recordAudit({
                    actionType: 'chat_trade',
                    status: 'denied',
                    market: 'market' in actionIntent ? actionIntent.market : undefined,
                    notionalUsd: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                    reason: error.reason || error.message,
                    policies: error.rejectedPolicies?.map((p: { name: string }) => p.name),
                    intent: actionIntent,
                });
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
            recordAudit({
                actionType: 'chat_trade',
                status: 'failed',
                market: 'market' in actionIntent ? actionIntent.market : undefined,
                notionalUsd: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                reason: error.message || 'Execution failed',
                intent: actionIntent,
            });
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
