import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock } from "lucide-react"

export default function VaultPage() {
  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard title="Total Deposited" value="$45,800" subtitle="Across all vaults" />
        <DataCard title="Total Earned" value="$2,340" subtitle="All-time yield" />
        <DataCard title="Current APY" value="12.4%" subtitle="Weighted average" />
        <DataCard title="Locked Until" value="Feb 17" subtitle="30 days remaining" />
      </div>

      {/* Vault Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit/Withdraw Card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/50">
              <TabsTrigger value="deposit" className="font-medium tracking-tight">
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="font-medium tracking-tight">
                Withdraw
              </TabsTrigger>
            </TabsList>
            <TabsContent value="deposit" className="mt-6 space-y-4">
              <div>
                <label className="text-caption mb-2 block">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="bg-black/50 border-border/50 text-lg font-mono pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                    USDC
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Balance</span>
                <span className="font-mono">$8,200.00</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium tracking-tight">
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Deposit to Vault
              </Button>
            </TabsContent>
            <TabsContent value="withdraw" className="mt-6 space-y-4">
              <div>
                <label className="text-caption mb-2 block">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="bg-black/50 border-border/50 text-lg font-mono pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                    USDC
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vault Balance</span>
                <span className="font-mono">$45,800.00</span>
              </div>
              <Button className="w-full bg-transparent font-medium tracking-tight" variant="outline">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw from Vault
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Vault Positions */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Your Positions</h2>
          <div className="space-y-4">
            {[
              { name: "Stable Yield Vault", deposited: "$25,000", apy: "8.5%", locked: true },
              { name: "ETH Momentum Vault", deposited: "$15,800", apy: "18.2%", locked: false },
              { name: "BTC Hedge Vault", deposited: "$5,000", apy: "6.8%", locked: true },
            ].map((vault, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {vault.locked ? (
                      <Lock className="h-4 w-4 text-primary" />
                    ) : (
                      <Wallet className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{vault.name}</p>
                    <p className="text-caption font-mono">{vault.deposited} deposited</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-mono font-medium text-sm">{vault.apy} APY</p>
                  <p className="text-caption">{vault.locked ? "Locked" : "Flexible"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
