'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ConnectWallet() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected && address) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="font-mono text-sm bg-black/50 border-border/50">
                        <Wallet className="mr-2 h-4 w-4 text-primary" />
                        {address.slice(0, 6)}...{address.slice(-4)}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => disconnect()} className="text-red-400">
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium"
                    disabled={isPending}
                >
                    <Wallet className="mr-2 h-4 w-4" />
                    {isPending ? 'Connecting...' : 'Connect Wallet'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {connectors.map((connector) => (
                    <DropdownMenuItem
                        key={connector.uid}
                        onClick={() => connect({ connector })}
                    >
                        {connector.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
