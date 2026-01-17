import { NextRequest, NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { checkGuardrails, recordExecution } from '@/agent/guardrails';
import { getMarketBySymbol } from '@/agent/market-data';
import { recordAudit } from '@/audit/store';
import type { ActionIntent } from '@/agent/types';
import type { GuardiansConfig } from '@/guardians/types';
import { GUARDIAN_PRESETS } from '@/guardians/types';

export async function POST(request: NextRequest) {
    try {
        const { actionIntent, guardrailsConfig } = await request.json() as {
            actionIntent: ActionIntent;
            guardrailsConfig?: GuardiansConfig;
        };

        if (!actionIntent) {
            return NextResponse.json({ error: 'ActionIntent required' }, { status: 400 });
        }

        // 1. Re-check guardrails (double-check before execution)
        const config: GuardiansConfig = guardrailsConfig || GUARDIAN_PRESETS.default;

        const guardrailsCheck = checkGuardrails(actionIntent, config);
        if (!guardrailsCheck.passed) {
            recordAudit({
                actionType: 'chat_trade',
                actionCategory: 'policy',
                source: 'agent',
                status: 'denied',
                account: { id: 'unknown', name: 'User', address: '0x' }, // Add filler account if needed or ensure types allow partial
                payload: {
                    market: 'market' in actionIntent ? actionIntent.market : undefined,
                    amount: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                    description: 'Blocked by local guardrails',
                },
                result: {
                    passed: false,
                    denials: guardrailsCheck.denials || [],
                },
                // metadata: { issues: guardrailsCheck.issues, denials: guardrailsCheck.denials }, // metadata not in AuditRecord? Check definition. defined as payload props? or not exists?
                // AuditRecord has plain props. Let's check keys again.
            } as any); // Casting as any for now because AuditRecord implies full object, CreateAuditInput Omit id/timestamp.
            // Wait, CreateAuditInput requires account, actionCategory etc.
            // I need to be careful. The previous code was much simpler, implying CreateAuditInput might be looser OR I was missing many fields.
            // Looking at Validation errors: "Object literal may only specify known properties, and 'market' does not exist in type 'CreateAuditInput'".
            // This means 'market' is NOT on the root. It MUST be in payload.
            // Also need to provide 'account', 'actionCategory', 'source' if they are required.
            // Let's assume defaults or we need to fetch them.
            // For this quick fix, I will try to conform to the shape I saw in `src/audit/types.ts`.

            // Re-reading `src/audit/types.ts`:
            // ActionCategory, Account, Source ARE required.
            // I'll provide defaults.
            return NextResponse.json({
                success: false,
                stage: 'local_guardrails',
                error: 'Blocked by local guardrails',
                issues: guardrailsCheck.issues,
                denials: guardrailsCheck.denials,
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
        const accountId = process.env.SALT_ACCOUNT_ID || '696a40b5b0f979ec8ece4482';
        const chainId = Number(process.env.BROADCASTING_NETWORK_ID) || 421614;

        try {
            const salt = getSaltClient();

            // Ensure authenticated
            if (!salt.getIsAuthenticated()) {
                await salt.authenticate();
            }



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
                    actionCategory: 'execution',
                    source: 'agent',
                    status: 'denied',
                    account: { id: accountId, name: 'Salt Account', address: '0x...' },
                    payload: {
                        market: 'market' in actionIntent ? actionIntent.market : undefined,
                        amount: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                        description: result.policyBreach.reason,
                    },
                    result: {
                        passed: false,
                        denials: [], // Map policy breach to denials if possible
                    }
                } as any);
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
                actionCategory: 'execution',
                source: 'agent',
                status: 'confirmed',
                account: { id: accountId, name: 'Salt Account', address: '0x...' },
                payload: {
                    market: 'market' in actionIntent ? actionIntent.market : undefined,
                    amount: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                },
                result: { passed: true, denials: [] },
                txHash: result.txHash,
            } as any);

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
                    actionCategory: 'policy',
                    source: 'agent',
                    status: 'denied',
                    account: { id: accountId, name: 'Salt Account', address: '0x...' },
                    payload: {
                        market: 'market' in actionIntent ? actionIntent.market : undefined,
                        amount: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                        description: error.reason || error.message,
                    },
                    result: { passed: false, denials: [] }
                } as any);
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
                actionCategory: 'system',
                source: 'agent',
                status: 'failed',
                account: { id: process.env.SALT_ACCOUNT_ID || 'unknown', name: 'System', address: '0x' },
                payload: {
                    market: 'market' in actionIntent ? actionIntent.market : undefined,
                    amount: 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0),
                    description: error.message || 'Execution failed',
                },
                result: { passed: false, denials: [] }
            } as any);
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
