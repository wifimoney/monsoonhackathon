import { checkGuardrails, recordExecution } from '@/agent/guardrails';
import { getMarketBySymbol } from '@/agent/market-data';
import type { GuardrailsConfig } from '@/agent/types';
import { recordAudit } from '@/audit/store';
import { checkAllGuardians } from '@/guardians/risk-engine';
import { recordTrade } from '@/guardians/state';
import { buildStrategyIntent, DEFAULT_ROUTER_ADDRESS } from '@/lib/strategy-intent';
import { getSaltClient } from '@/salt/client';

const DEFAULT_GUARDRAILS: GuardrailsConfig = {
    allowedMarkets: ['GOLD', 'OIL'],
    maxPerTx: 250,
    cooldownSeconds: 60,
    maxSlippageBps: 100,
};

const toHexData = (value: string) => `0x${Buffer.from(value, 'utf8').toString('hex')}`;

export interface StrategyExecutionInput {
    actionType: string;
    market: string;
    side: 'BUY' | 'SELL';
    notionalUsd: number;
    leverage?: number;
    orderType?: 'SPOT_MARKET_ORDER' | 'SPOT_LIMIT_ORDER';
    metadata?: Record<string, unknown>;
}

export async function executeStrategyAction(input: StrategyExecutionInput) {
    const intent = buildStrategyIntent({
        market: input.market,
        side: input.side,
        notionalUsd: input.notionalUsd,
        leverage: input.leverage,
        orderType: input.orderType,
        targetContract: DEFAULT_ROUTER_ADDRESS,
    });

    const guardrails = checkGuardrails(intent, DEFAULT_GUARDRAILS);
    if (!guardrails.passed) {
        recordAudit({
            actionType: input.actionType,
            status: 'denied',
            market: intent.market,
            notionalUsd: intent.notionalUsd,
            reason: 'Blocked by local guardrails',
            intent,
            metadata: { issues: guardrails.issues, ...input.metadata },
        });
        return {
            status: 400,
            body: {
                success: false,
                stage: 'local_guardrails',
                issues: guardrails.issues,
            },
        };
    }

    const guardians = checkAllGuardians(intent);
    if (!guardians.passed) {
        recordAudit({
            actionType: input.actionType,
            status: 'denied',
            market: intent.market,
            notionalUsd: intent.notionalUsd,
            reason: 'Blocked by guardians',
            policies: guardians.denials.map((denial) => denial.name),
            intent,
            metadata: { denials: guardians.denials, ...input.metadata },
        });
        return {
            status: 403,
            body: {
                success: false,
                stage: 'guardians',
                denials: guardians.denials,
            },
        };
    }

    const marketInfo = getMarketBySymbol(input.market);
    if (!marketInfo) {
        recordAudit({
            actionType: input.actionType,
            status: 'failed',
            market: intent.market,
            notionalUsd: intent.notionalUsd,
            reason: 'Market not found',
            intent,
            metadata: input.metadata,
        });
        return {
            status: 400,
            body: { success: false, stage: 'validation', error: 'Market not found' },
        };
    }

    const salt = getSaltClient();
    if (!salt.getIsAuthenticated()) {
        await salt.authenticate();
    }

    const accountId = salt.getActiveAccountId() || process.env.SALT_ACCOUNT_ID;
    if (!accountId) {
        recordAudit({
            actionType: input.actionType,
            status: 'failed',
            market: intent.market,
            notionalUsd: intent.notionalUsd,
            reason: 'No Salt account selected',
            intent,
            metadata: input.metadata,
        });
        return {
            status: 400,
            body: { success: false, stage: 'account', error: 'No Salt account selected' },
        };
    }

    try {
        const result = await salt.submitTx({
            accountId,
            to: DEFAULT_ROUTER_ADDRESS,
            data: toHexData(`${input.actionType}:${input.market}`),
            value: '0',
        });

        if (result.policyBreach?.denied) {
            recordAudit({
                actionType: input.actionType,
                status: 'denied',
                market: intent.market,
                notionalUsd: intent.notionalUsd,
                reason: result.policyBreach.reason,
                intent,
                metadata: input.metadata,
            });
            return {
                status: 403,
                body: {
                    success: false,
                    stage: 'salt_policy',
                    policyBreach: result.policyBreach,
                },
            };
        }

        recordExecution();
        if (intent.notionalUsd > 0) {
            recordTrade(intent.market, intent.notionalUsd);
        }
        recordAudit({
            actionType: input.actionType,
            status: 'confirmed',
            market: intent.market,
            notionalUsd: intent.notionalUsd,
            txHash: result.txHash,
            intent,
            metadata: input.metadata,
        });

        return {
            status: 200,
            body: {
                success: true,
                stage: 'confirmed',
                txHash: result.txHash,
                receipt: {
                    market: intent.market,
                    side: intent.side,
                    size: intent.notionalUsd,
                    price: marketInfo.price,
                },
            },
        };
    } catch (error: any) {
        recordAudit({
            actionType: input.actionType,
            status: 'failed',
            market: intent.market,
            notionalUsd: intent.notionalUsd,
            reason: error.message || 'Execution failed',
            intent,
            metadata: input.metadata,
        });
        return {
            status: 500,
            body: { success: false, stage: 'execution', error: error.message || 'Execution failed' },
        };
    }
}
