import { getSpendingState } from './spending-tracker';
import type { ActionIntent, MarketMatch, GuardrailsConfig } from './types';

// ============ TYPES ============
export interface PositionSizeRecommendation {
    recommendedSize: number;
    maxAllowedSize: number;
    reasoning: string[];
    constraints: {
        name: string;
        limit: number;
        remaining: number;
        constrains: boolean;
    }[];
    riskAdjustment?: {
        applied: boolean;
        factor: number;
        reason: string;
    };
}

// ============ CALCULATOR ============
export function calculateOptimalPosition(
    market: MarketMatch,
    guardrailsConfig: GuardrailsConfig,
    requestedSize?: number
): PositionSizeRecommendation {
    const constraints: PositionSizeRecommendation['constraints'] = [];
    const reasoning: string[] = [];

    // 1. Per-transaction limit
    const perTxLimit = guardrailsConfig.maxPerTx || 250;
    constraints.push({
        name: 'Per-Transaction',
        limit: perTxLimit,
        remaining: perTxLimit,
        constrains: true,
    });

    // 2. Daily spending limit
    const spending = getSpendingState();
    const dailyRemaining = spending.limits.daily.limit - spending.limits.daily.spent;
    constraints.push({
        name: 'Daily Budget',
        limit: spending.limits.daily.limit,
        remaining: dailyRemaining,
        constrains: dailyRemaining < perTxLimit,
    });

    // 3. Weekly spending limit
    const weeklyRemaining = spending.limits.weekly.limit - spending.limits.weekly.spent;
    constraints.push({
        name: 'Weekly Budget',
        limit: spending.limits.weekly.limit,
        remaining: weeklyRemaining,
        constrains: weeklyRemaining < perTxLimit,
    });

    // Find the binding constraint
    const maxAllowedSize = Math.min(perTxLimit, dailyRemaining, weeklyRemaining);

    // 4. Risk-based adjustment
    let riskAdjustment: PositionSizeRecommendation['riskAdjustment'] = undefined;
    let riskFactor = 1.0;

    // Reduce size for high-spread markets
    if (market.market.spread > 0.002) {
        riskFactor *= 0.8;
        riskAdjustment = {
            applied: true,
            factor: 0.8,
            reason: `High spread (${(market.market.spread * 100).toFixed(2)}%) - reduced 20%`,
        };
        reasoning.push('Reduced 20% due to high spread');
    }

    // Reduce size for low liquidity
    if (market.liquidityScore < 0.3) {
        const newFactor = riskAdjustment ? riskAdjustment.factor * 0.7 : 0.7;
        riskFactor *= 0.7;
        riskAdjustment = {
            applied: true,
            factor: newFactor,
            reason: riskAdjustment
                ? `${riskAdjustment.reason}, low liquidity - reduced 30%`
                : 'Low liquidity - reduced 30%',
        };
        reasoning.push('Reduced 30% due to low liquidity');
    }

    // Reduce size for volatile assets
    if (market.market.tags.includes('volatile')) {
        const newFactor = riskAdjustment ? riskAdjustment.factor * 0.9 : 0.9;
        riskFactor *= 0.9;
        riskAdjustment = {
            applied: true,
            factor: newFactor,
            reason: riskAdjustment
                ? `${riskAdjustment.reason}, volatile - reduced 10%`
                : 'Volatile asset - reduced 10%',
        };
        reasoning.push('Reduced 10% due to volatility');
    }

    // 5. Calculate recommended size
    let recommendedSize: number;

    if (requestedSize) {
        // User requested specific size - cap it
        recommendedSize = Math.min(requestedSize, maxAllowedSize * riskFactor);

        if (recommendedSize < requestedSize) {
            reasoning.push(`Capped from $${requestedSize} to $${recommendedSize.toFixed(0)}`);
        }
    } else {
        // No size specified - recommend optimal (20% of max)
        recommendedSize = Math.min(maxAllowedSize * 0.2 * riskFactor, 100);
        reasoning.push('Default: 20% of available budget');
    }

    // Round to nice number
    recommendedSize = Math.round(recommendedSize / 5) * 5;
    if (recommendedSize < 10) recommendedSize = 10;

    return {
        recommendedSize,
        maxAllowedSize,
        reasoning,
        constraints,
        riskAdjustment,
    };
}
