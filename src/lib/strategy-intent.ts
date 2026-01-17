import type { ActionIntent } from '@/agent/types';

export const DEFAULT_ROUTER_ADDRESS = '0x1111111111111111111111111111111111111111';

export function buildStrategyIntent(params: {
    market: string;
    side: 'BUY' | 'SELL';
    notionalUsd: number;
    leverage?: number;
    orderType?: ActionIntent['type'];
    targetContract?: string;
}): ActionIntent & { leverage?: number; targetContract?: string } {
    const type = params.orderType ?? 'SPOT_MARKET_ORDER';

    return {
        type,
        market: `${params.market}/USDH`,
        side: params.side,
        notionalUsd: params.notionalUsd,
        maxSlippageBps: 50,
        validForSeconds: 120,
        rationale: ['Strategy execution'],
        riskNotes: [],
        leverage: params.leverage,
        targetContract: params.targetContract ?? DEFAULT_ROUTER_ADDRESS,
    };
}
