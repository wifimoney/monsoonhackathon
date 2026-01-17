'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { arbitrumSepolia, baseSepolia, mainnet, arbitrum, optimism, polygon, base } from 'wagmi/chains';
import { bsc, avalanche } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ReactNode, useState } from 'react';
import { defineChain, type Chain } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';

// HyperEVM chain definition
const hyperEvm = defineChain({
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.hyperliquid.xyz/evm'],
        },
    },
    blockExplorers: {
        default: {
            name: 'HyperEVM Explorer',
            url: 'https://explorer.hyperliquid.xyz',
        },
    },
    testnet: false,
}) as Chain;

export const allChains: readonly [Chain, ...Chain[]] = [
    mainnet,
    arbitrum,
    optimism,
    polygon,
    base,
    bsc,
    avalanche,
    hyperEvm,
    arbitrumSepolia,
    baseSepolia,
];

// Simplified Wagmi config - Injected only (MetaMask, etc) to avoid AppKit 403 errors
export const wagmiConfig = createConfig({
    chains: allChains,
    connectors: [
        injected(),
    ],
    transports: {
        [mainnet.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
        [polygon.id]: http(),
        [base.id]: http(),
        [bsc.id]: http(),
        [avalanche.id]: http(),
        [hyperEvm.id]: http(),
        [arbitrumSepolia.id]: http(),
        [baseSepolia.id]: http(),
    },
    ssr: true,
});

// Provider component
export function Web3Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
