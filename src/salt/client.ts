import { Salt } from "salt-sdk";
import { ethers, Signer } from "ethers";
import {
    getSigner,
    broadcasting_network_provider,
    orchestration_network_provider
} from "./config";
import type {
    TransferParams,
    TransferResult,
    SubmitTxParams,
    TxResult,
    SaltAccount,
    SaltOrganization,
    PolicyBreach
} from "./types";

/**
 * SaltClient - Wrapper class for Salt SDK operations
 */
export class SaltClient {
    private salt: Salt;
    private signer: Signer | null = null;
    private isAuthenticated = false;
    private activeAccountId: string | null = null;

    constructor() {
        this.salt = new Salt({ environment: "TESTNET" });
    }

    /**
     * Authenticate with Salt using the configured signer
     */
    async authenticate(): Promise<{ success: boolean; address: string }> {
        try {
            this.signer = getSigner();
            await this.salt.authenticate(this.signer);
            this.isAuthenticated = true;
            const address = await this.signer.getAddress();
            return { success: true, address };
        } catch (error) {
            console.error("Salt auth failed:", error);
            throw error;
        }
    }

    /**
     * Check if client is authenticated
     */
    getIsAuthenticated(): boolean {
        return this.isAuthenticated;
    }

    /**
     * Get all organizations the signer belongs to
     */
    async getOrganisations(): Promise<SaltOrganization[]> {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }
        return this.salt.getOrganisations();
    }

    /**
     * Get accounts for an organization
     */
    async getAccounts(orgId: string): Promise<SaltAccount[]> {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }
        const accounts = await this.salt.getAccounts(orgId);
        return accounts.map((acc: any) => ({
            id: acc.id,
            name: acc.name || "Salt Account",
            address: acc.publicKey,
            orgId,
        }));
    }

    /**
     * Set the active account for transactions
     */
    setActiveAccount(accountId: string): void {
        this.activeAccountId = accountId;
    }

    /**
     * Get the active account ID
     */
    getActiveAccountId(): string | null {
        return this.activeAccountId;
    }

    /**
     * Execute a transfer through Salt with policy checking
     */
    async transfer(params: TransferParams): Promise<TransferResult> {
        if (!this.isAuthenticated || !this.signer) {
            throw new Error("Not authenticated");
        }

        const logs: string[] = [];
        const log = (msg: string) => logs.push(msg);

        try {
            log(`Initiating transfer: ${params.amount} ${params.token} to ${params.to}`);

            // For native transfers, use ETH value
            const value = params.token === "ETH" || params.token === "NATIVE"
                ? params.amount
                : "0";

            const transfer = await this.salt.submitTx({
                accountId: params.accountId,
                to: params.to,
                value,
                chainId: broadcasting_network_provider.network?.chainId || 421614,
                signer: this.signer,
                sendingProvider: broadcasting_network_provider,
            });

            return new Promise((resolve) => {
                transfer.onPropose((data: unknown) => log(`PROPOSE: ${JSON.stringify(data)}`));
                transfer.onSign((data: unknown) => log(`SIGNING: ${JSON.stringify(data)}`));
                transfer.onCombine((data: unknown) => log(`COMBINE: ${JSON.stringify(data)}`));
                transfer.onBroadcast((data: unknown) => log(`BROADCAST: ${JSON.stringify(data)}`));

                transfer.onEnd((data: { receipt?: { transactionHash: string } }) => {
                    if (data?.receipt?.transactionHash) {
                        log(`✓ Transaction confirmed: ${data.receipt.transactionHash}`);
                        resolve({
                            success: true,
                            txHash: data.receipt.transactionHash,
                            status: "confirmed",
                            logs,
                        });
                    } else {
                        log("✓ Transaction completed");
                        resolve({ success: true, status: "confirmed", logs });
                    }
                });

                // Policy denial handlers
                transfer.onTransition(1, 5, (data: unknown) => {
                    const breach: PolicyBreach = {
                        denied: true,
                        reason: "Transaction denied by policy",
                        rule: "PROPOSE->END",
                        details: data as Record<string, unknown>,
                    };
                    log(`✗ POLICY BREACH: ${JSON.stringify(data)}`);
                    resolve({
                        success: false,
                        status: "denied",
                        policyBreach: breach,
                        logs,
                    });
                });

                // Other error handlers
                transfer.onTransition(0, 5, (data: unknown) => {
                    log(`✗ Error starting: ${JSON.stringify(data)}`);
                    resolve({ success: false, status: "failed", logs });
                });

                transfer.onTransition(2, 5, (data: unknown) => {
                    log(`✗ Signing error: ${JSON.stringify(data)}`);
                    resolve({ success: false, status: "failed", logs });
                });

                transfer.onTransition(3, 5, (data: unknown) => {
                    log(`✗ Combine error: ${JSON.stringify(data)}`);
                    resolve({ success: false, status: "failed", logs });
                });
            });
        } catch (error: any) {
            // Check if it's a policy denial
            if (error.type === "PolicyDenied" || error.code === "POLICY_BREACH") {
                return {
                    success: false,
                    status: "denied",
                    policyBreach: {
                        denied: true,
                        reason: error.reason || error.message,
                        rule: error.violatedRule || error.policyName || "unknown",
                        details: error.details,
                    },
                    logs,
                };
            }
            throw error;
        }
    }

    /**
     * Submit an arbitrary transaction through Salt
     */
    async submitTx(params: SubmitTxParams): Promise<TxResult> {
        if (!this.isAuthenticated || !this.signer) {
            throw new Error("Not authenticated");
        }

        const logs: string[] = [];
        const log = (msg: string) => logs.push(msg);

        try {
            log(`Submitting tx to ${params.to}`);

            const transfer = await this.salt.submitTx({
                accountId: params.accountId,
                to: params.to,
                value: params.value || "0",
                data: params.data,
                chainId: broadcasting_network_provider.network?.chainId || 421614,
                signer: this.signer,
                sendingProvider: broadcasting_network_provider,
            });

            return new Promise((resolve) => {
                transfer.onPropose((data: unknown) => log(`PROPOSE: ${JSON.stringify(data)}`));
                transfer.onSign((data: unknown) => log(`SIGNING: ${JSON.stringify(data)}`));
                transfer.onCombine((data: unknown) => log(`COMBINE: ${JSON.stringify(data)}`));
                transfer.onBroadcast((data: unknown) => log(`BROADCAST: ${JSON.stringify(data)}`));

                transfer.onEnd((data: { receipt?: { transactionHash: string } }) => {
                    if (data?.receipt?.transactionHash) {
                        resolve({
                            success: true,
                            txHash: data.receipt.transactionHash,
                            status: "confirmed",
                            logs,
                        });
                    } else {
                        resolve({ success: true, status: "confirmed", logs });
                    }
                });

                transfer.onTransition(1, 5, (data: unknown) => {
                    resolve({
                        success: false,
                        status: "denied",
                        policyBreach: {
                            denied: true,
                            reason: "Transaction denied by policy",
                            rule: "PROPOSE->END",
                            details: data as Record<string, unknown>,
                        },
                        logs,
                    });
                });

                transfer.onTransition(0, 5, () => resolve({ success: false, status: "failed", logs }));
                transfer.onTransition(2, 5, () => resolve({ success: false, status: "failed", logs }));
                transfer.onTransition(3, 5, () => resolve({ success: false, status: "failed", logs }));
            });
        } catch (error: any) {
            if (error.type === "PolicyDenied" || error.code === "POLICY_BREACH") {
                return {
                    success: false,
                    status: "denied",
                    policyBreach: {
                        denied: true,
                        reason: error.reason || error.message,
                        rule: error.violatedRule || "unknown",
                    },
                    logs,
                };
            }
            throw error;
        }
    }
}

// Singleton instance
let saltClientInstance: SaltClient | null = null;

export function getSaltClient(): SaltClient {
    if (!saltClientInstance) {
        saltClientInstance = new SaltClient();
    }
    return saltClientInstance;
}

export function resetSaltClient(): void {
    saltClientInstance = null;
}
