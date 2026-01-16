import type { ParsedIntent } from './intent-classifier';
import type { MarketMatch, ActionIntent } from './types';

const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
const DEFAULT_VALID_SECONDS = 60;
const DEFAULT_SIZE = 100;

export function buildActionIntent(
    intent: ParsedIntent,
    topMatch: MarketMatch
): ActionIntent {
    // Determine side
    let side: 'BUY' | 'SELL' = 'BUY';
    if (intent.strategy === 'directional_short') {
        side = 'SELL';
    }

    // Determine size
    const notionalUsd = intent.constraints.maxSize || DEFAULT_SIZE;

    // Build rationale
    const rationale: string[] = [];
    if (topMatch.matchReasons.length > 0) {
        rationale.push(...topMatch.matchReasons);
    }
    if (intent.preference === 'hedge') {
        rationale.push('Fits hedging strategy');
    }
    if (intent.preference === 'low_risk') {
        rationale.push('Low risk preference');
    }
    if (topMatch.liquidityScore > 0.6) {
        rationale.push('Strong liquidity for execution');
    }

    // Build risk notes
    const riskNotes: string[] = [];
    if (topMatch.market.spread > 0.001) {
        riskNotes.push(`Spread: ${(topMatch.market.spread * 100).toFixed(2)}%`);
    }
    if (Math.abs(topMatch.market.fundingRate) > 0.0002) {
        riskNotes.push(`Funding: ${(topMatch.market.fundingRate * 100).toFixed(3)}%`);
    }
    if (topMatch.riskScore < 0.5) {
        riskNotes.push('Higher volatility expected');
    }
    if (topMatch.market.tags.includes('volatile')) {
        riskNotes.push('Volatile asset');
    }

    return {
        type: 'SPOT_MARKET_ORDER',
        market: `${topMatch.symbol}/USDH`,
        side,
        notionalUsd,
        maxSlippageBps: DEFAULT_SLIPPAGE_BPS,
        validForSeconds: DEFAULT_VALID_SECONDS,
        rationale,
        riskNotes,
    };
}
