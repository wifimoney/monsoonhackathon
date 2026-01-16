'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { arbitrumSepolia, baseSepolia, mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { ReactNode, useState } from 'react';

// Simplified Wagmi config - Injected only (MetaMask, etc) to avoid AppKit 403 errors
export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia, baseSepolia, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
