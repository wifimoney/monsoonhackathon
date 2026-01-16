import { ethers } from "ethers";

// Environment variables for Salt configuration
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
export const ORCHESTRATION_NETWORK_RPC_NODE_URL =
    process.env.ORCHESTRATION_NETWORK_RPC_NODE_URL || "https://sepolia-rollup.arbitrum.io/rpc";
export const BROADCASTING_NETWORK_RPC_NODE_URL =
    process.env.BROADCASTING_NETWORK_RPC_NODE_URL || "https://sepolia-rollup.arbitrum.io/rpc";
export const BROADCASTING_NETWORK_ID =
    Number(process.env.BROADCASTING_NETWORK_ID) || 421614;
export const AGENT = process.env.AGENT || "";

// Providers
export const orchestration_network_provider =
    new ethers.providers.StaticJsonRpcProvider({
        url: ORCHESTRATION_NETWORK_RPC_NODE_URL,
        skipFetchSetup: true,
    });

export const broadcasting_network_provider =
    new ethers.providers.StaticJsonRpcProvider({
        url: BROADCASTING_NETWORK_RPC_NODE_URL,
        skipFetchSetup: true,
    });

// Signer (server-side only)
export function getSigner() {
    if (!PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable is not set");
    }
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    return wallet.connect(orchestration_network_provider);
}

// Validate network configuration
export async function validateNetworkConfig() {
    const network = await broadcasting_network_provider.getNetwork();
    if (network.chainId !== BROADCASTING_NETWORK_ID) {
        throw new Error(
            `Broadcasting network chain ID mismatch: ${network.chainId} doesn't match expected ${BROADCASTING_NETWORK_ID}`
        );
    }
    return true;
}
