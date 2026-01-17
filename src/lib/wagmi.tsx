'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, metaMask } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Configure wagmi
export const config = createConfig({
    chains: [arbitrumSepolia],
    connectors: [
        injected(),
        metaMask(),
    ],
    transports: {
        [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    },
});

// Create a client
const queryClient = new QueryClient();

// Provider component
export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
