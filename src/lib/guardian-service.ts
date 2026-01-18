import { checkGuardrails } from '@/agent/guardrails';
import { GUARDIAN_PRESETS } from '@/guardians/types';
import type { ActionIntent } from '@/agent/types';
import type { GuardiansConfig } from '@/guardians/types';

/**
 * Interface for trade requests coming from the frontend/API
 */
export interface TradeRequest {
    symbol: string;         // e.g. "ETH-PERP"
    size: number;           // USD value
    side: 'BUY' | 'SELL';   // Direction
    leverage?: number;      // Leverage multiplier
}

/**
 * Result of the guardian validation
 */
export interface ValidationResult {
    success: boolean;
    reason?: string;
    denials?: any[];
}

/**
 * Service to validate trade requests against Salt's Guardian Policies
 * 
 * In a full production system, this would:
 * 1. Fetch the user's specific policy configuration from DB/Salt API
 * 2. Validate the request against that specific config
 * 
 * For this MVP:
 * 1. Uses a default 'conservative' preset for all users to demonstrate enforcement
 */
export class GuardianService {

    /**
     * Get the active configuration for the user
     * Mocked to return a default preset for MVP
     */
    private static getConfig(): GuardiansConfig {
        // Using 'default' preset: Max Spend $250/trade, Max Daily $1000
        return GUARDIAN_PRESETS.default;
    }

    /**
     * Validate a trade request against active policies
     */
    public static async validateTradeRequest(request: TradeRequest): Promise<ValidationResult> {
        const config = this.getConfig();

        // Map generic TradeRequest to internal ActionIntent used by guardrails
        // We use 'SPOT_MARKET_ORDER' type as a proxy for "Trade Intent" even for Perps in this MVP logic
        const intent: ActionIntent = {
            type: 'SPOT_MARKET_ORDER',
            market: request.symbol,
            side: request.side,
            notionalUsd: request.size,
            maxSlippageBps: 100, // Default 1%
            validForSeconds: 60,
            rationale: ['User initiated trade'],
            riskNotes: []
        };

        // Run the check
        const result = checkGuardrails(intent, config);

        if (result.passed) {
            return { success: true };
        } else {
            // Format the failure reason
            const primaryDenial = result.denials[0];
            const reason = primaryDenial
                ? `${primaryDenial.name}: ${primaryDenial.reason}`
                : "Policy violation detected";

            return {
                success: false,
                reason,
                denials: result.denials
            };
        }
    }
}
