import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, TrendingUp, TrendingDown, Zap } from "lucide-react"

export default function PearPage() {
  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard title="Active Pairs" value="12" subtitle="Cross-asset strategies" />
        <DataCard title="Total P&L" value="+$3,240" subtitle="This month" />
        <DataCard title="Win Rate" value="68%" subtitle="Last 50 trades" />
        <DataCard title="Avg. Hold Time" value="4.2h" subtitle="Per position" />
      </div>

      {/* Pair Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Pair Trade */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-primary" />
            <h2>Create Pair Trade</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
              <div>
                <label className="text-caption mb-2 block">Long Asset</label>
                <Select defaultValue="eth">
                  <SelectTrigger className="bg-black/50 border-border/50 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eth">ETH</SelectItem>
                    <SelectItem value="btc">BTC</SelectItem>
                    <SelectItem value="sol">SOL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground mb-2" />
              <div>
                <label className="text-caption mb-2 block">Short Asset</label>
                <Select defaultValue="btc">
                  <SelectTrigger className="bg-black/50 border-border/50 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="btc">BTC</SelectItem>
                    <SelectItem value="eth">ETH</SelectItem>
                    <SelectItem value="sol">SOL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-caption mb-2 block">Position Size</label>
              <div className="relative">
                <Input type="number" placeholder="0.00" className="bg-black/50 border-border/50 font-mono pr-16" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                  USDC
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-black/30 border border-border/30">
              <p className="text-caption mb-2">Strategy Summary</p>
              <p className="text-sm">
                Long <span className="text-emerald-400 font-mono font-medium">ETH</span> / Short{" "}
                <span className="text-red-400 font-mono font-medium">BTC</span>
              </p>
              <p className="text-caption mt-1">Betting ETH outperforms BTC</p>
            </div>

            <Button className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium tracking-tight">
              Open Pair Position
            </Button>
          </div>
        </div>

        {/* Active Pair Positions */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Active Positions</h2>
          <div className="space-y-4">
            {[
              { long: "ETH", short: "BTC", size: "$5,000", pnl: "+$320", pnlPercent: "+6.4%", positive: true },
              { long: "SOL", short: "ETH", size: "$2,500", pnl: "-$85", pnlPercent: "-3.4%", positive: false },
              { long: "BTC", short: "SOL", size: "$3,200", pnl: "+$180", pnlPercent: "+5.6%", positive: true },
            ].map((position, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  {position.positive ? (
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                  <div>
                    <p className="font-mono font-medium text-sm">
                      <span className="text-emerald-400">{position.long}</span>
                      {" / "}
                      <span className="text-red-400">{position.short}</span>
                    </p>
                    <p className="text-caption font-mono">{position.size} position</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono font-medium text-sm ${position.positive ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {position.pnl}
                  </p>
                  <p className="text-caption font-mono">{position.pnlPercent}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
