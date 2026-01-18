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
 */
export class GuardianService {

    /**
     * Get the active configuration for the user
     * Fetches from SQLite if available, merges with defaults
     */
    private static async getConfig(): Promise<GuardiansConfig> {
        const defaultConfig = GUARDIAN_PRESETS.default;

        try {
            const orgId = process.env.SALT_ORG_ID;
            const accountId = process.env.SALT_ACCOUNT_ID;

            if (orgId && accountId) {
                const { getDatabase } = await import('@/audit/db');
                const db = getDatabase();

                const row = db.prepare('SELECT config_json FROM guardrails WHERE org_id = ? AND account_id = ?').get(orgId, accountId) as { config_json: string } | undefined;

                if (row) {
                    const savedConfig = JSON.parse(row.config_json);

                    // If saved config has full GuardiansConfig structure, use it
                    if (savedConfig.spend && savedConfig.leverage) {
                        return savedConfig as GuardiansConfig;
                    }

                    // If saved config only has guardian toggles (from UI), merge with defaults
                    if (savedConfig.guardians && Array.isArray(savedConfig.guardians)) {
                        const mergedConfig = { ...defaultConfig };

                        // Map UI guardian IDs to config keys
                        const guardianMap: Record<string, keyof GuardiansConfig> = {
                            'maxDrawdown': 'loss',
                            'whitelistOnly': 'venue',
                            'rateLimiter': 'rate',
                            'positionSizeCap': 'spend',
                            'slippageGuard': 'exposure',
                            'maxLeverage': 'leverage'
                        };

                        for (const g of savedConfig.guardians) {
                            const configKey = guardianMap[g.id];
                            if (configKey && mergedConfig[configKey]) {
                                (mergedConfig[configKey] as any).enabled = g.active;
                            }
                        }

                        return mergedConfig;
                    }
                }
            }
        } catch (error) {
            console.warn("GuardianService: Failed to load config from DB, using default.", error);
        }

        return defaultConfig;
    }

    /**
     * Validate a trade request against active policies
     */
    public static async validateTradeRequest(request: TradeRequest): Promise<ValidationResult> {
        const config = await this.getConfig();

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

    /**
     * Validate a vault action (deposit/withdraw) against policies
     */
    public static async validateVaultAction(request: VaultActionRequest): Promise<ValidationResult> {
        const config = await this.getConfig();

        // Map vault action to internal ActionIntent
        // Use SPOT_MARKET_ORDER as a proxy for vault operations
        const intent: ActionIntent = {
            type: 'SPOT_MARKET_ORDER',
            market: `VAULT_${request.tokenSymbol}`,
            side: request.action === 'deposit' ? 'BUY' : 'SELL',
            notionalUsd: request.amountUsd,
            maxSlippageBps: 50, // 0.5% for vault ops
            validForSeconds: 300,
            rationale: [`Vault ${request.action} request`],
            riskNotes: []
        };

        // Run the check
        const result = checkGuardrails(intent, config);

        if (result.passed) {
            return { success: true };
        } else {
            const primaryDenial = result.denials[0];
            const reason = primaryDenial
                ? `${primaryDenial.name}: ${primaryDenial.reason}`
                : "Vault policy violation detected";

            return {
                success: false,
                reason,
                denials: result.denials
            };
        }
    }
}

/**
 * Interface for vault action requests
 */
export interface VaultActionRequest {
    action: 'deposit' | 'withdraw';
    amountUsd: number;
    tokenSymbol: string;
}
