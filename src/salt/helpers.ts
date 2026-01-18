import { broadcasting_network_provider } from "./config";

/**
 * Utility to print formatted console message
 */
export function printRectangle(mainText: string): void {
    const width = 84;
    const mainTextLength = mainText.length;
    const mainTextX = Math.floor((width - mainTextLength) / 2);

    console.log("+" + "-".repeat(width - 2) + "+");
    console.log(
        "|" +
        "   " +
        "\x1b[32m" +
        mainText +
        "\x1b[0m" +
        " ".repeat(width - mainTextX - mainTextLength) +
        "|"
    );
    console.log("+" + "-".repeat(width - 2) + "+");
}

/**
 * Returns true if the networkId matches the broadcasting provider's chain ID
 */
export async function networkSanityCheck(networkId: number): Promise<boolean> {
    const network = await broadcasting_network_provider.getNetwork();
    return network.chainId === networkId;
}

/**
 * Format address for display
 */
export function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Stub for askForInput - legacy strategy support
 * In production, this would prompt for user input
 */
export async function askForInput(prompt: string): Promise<string> {
    console.log(`[askForInput] ${prompt} - returning default "0"`);
    return "0";
}
