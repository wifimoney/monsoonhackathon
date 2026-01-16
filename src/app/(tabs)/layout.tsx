import { TabNav } from "@/components/TabNav";
import { ConnectWallet } from "@/components/ConnectWallet";

export default function TabLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-purple-500 bg-clip-text text-transparent">
                            Salt DeFi
                        </h1>
                        <TabNav />
                    </div>
                    <ConnectWallet />
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
