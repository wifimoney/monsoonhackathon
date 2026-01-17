import { Salt } from "salt-sdk";
import { ethers, BigNumber } from "ethers";
import { broadcasting_network_provider, getSigner } from "./config";

// Salt SDK singleton
export const salt = new Salt({ environment: "TESTNET" });

// Export types
export type { Salt } from "salt-sdk";
export { BigNumber } from "ethers";

/**
 * Transaction submission result
 */
export interface TransactionResult {
    success: boolean;
    transactionHash?: string;
    error?: string;
    logs: string[];
}

/**
 * Submit a transaction through Salt's MPC protocol
 */
export async function sendTransaction({
    accountId,
    recipient,
    value,
    data,
    gas,
    onLog,
}: {
    accountId: string;
    recipient: string;
    value: BigNumber;
    data?: string;
    gas?: string;
    onLog?: (message: string, type: 'info' | 'success' | 'error') => void;
}): Promise<TransactionResult> {
    const logs: string[] = [];
    const log = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
        logs.push(`[${type.toUpperCase()}] ${msg}`);
        onLog?.(msg, type);
    };

    try {
        const signer = getSigner();
        await salt.authenticate(signer);

        log(`Authenticated signer: ${await signer.getAddress()}`);
        log(`Submitting transaction to ${recipient} for ${ethers.utils.formatEther(value)} ETH`);

        const transfer = await salt.submitTx({
            accountId,
            to: recipient,
            value: ethers.utils.formatEther(value),
            chainId: broadcasting_network_provider.network.chainId,
            signer,
            sendingProvider: broadcasting_network_provider,
            data: data ?? undefined,
            gas: gas ?? undefined,
        });

        return new Promise((resolve) => {
            // Observe state transitions
            // Observe state transitions
            transfer.onPropose((data: any) => log(`PROPOSE: ${JSON.stringify(data)}`));
            transfer.onSign((data: any) => log(`SIGNING: ${JSON.stringify(data)}`));
            transfer.onCombine((data: any) => log(`COMBINE: ${JSON.stringify(data)}`));
            transfer.onBroadcast((data: any) => log(`BROADCAST: ${JSON.stringify(data)}`));

            transfer.onEnd((data: { receipt: { transactionHash: string } }) => {
                if (data?.receipt?.transactionHash) {
                    log(`Transaction broadcasted: ${data.receipt.transactionHash}`, 'success');
                    resolve({
                        success: true,
                        transactionHash: data.receipt.transactionHash,
                        logs,
                    });
                } else {
                    log("Transaction completed but no hash returned", 'success');
                    resolve({ success: true, logs });
                }
            });

            // Observe error states
            transfer.onTransition(0, 5, (data: any) => {
                log(`IDLE->END Error starting transfer: ${JSON.stringify(data)}`, 'error');
                resolve({ success: false, error: "Error starting transfer", logs });
            });

            transfer.onTransition(1, 5, (data: any) => {
                log(`PROPOSE->END Policy breach: ${JSON.stringify(data)}`, 'error');
                resolve({ success: false, error: "Policy breach - transaction denied", logs });
            });

            transfer.onTransition(2, 5, (data: any) => {
                log(`SIGN->END Error signing: ${JSON.stringify(data)}`, 'error');
                resolve({ success: false, error: "Error signing transaction", logs });
            });

            transfer.onTransition(3, 5, (data: any) => {
                log(`COMBINE->END Error combining: ${JSON.stringify(data)}`, 'error');
                resolve({ success: false, error: "Error combining signatures", logs });
            });
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error: ${errorMessage}`, 'error');
        return { success: false, error: errorMessage, logs };
    }
}

/**
 * Get Salt accounts for the current signer
 */
export async function getAccounts(organizationId: string) {
    const signer = getSigner();
    await salt.authenticate(signer);
    return salt.getAccounts(organizationId);
}

/**
 * Get Salt organizations
 */
export async function getOrganizations() {
    const signer = getSigner();
    await salt.authenticate(signer);
    return salt.getOrganisations();
}
