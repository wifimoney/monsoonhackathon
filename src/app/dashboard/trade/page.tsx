import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDownUp, TrendingUp, TrendingDown } from "lucide-react"

export default function TradePage() {
  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard title="Portfolio Value" value="$24,500" subtitle="+2.4% today" />
        <DataCard title="Open Positions" value="5" subtitle="3 long, 2 short" />
        <DataCard title="24h P&L" value="+$580" subtitle="+2.37%" />
        <DataCard title="Available Balance" value="$8,200" subtitle="USDC" />
      </div>

      {/* Trade Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap Card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Swap</h2>

          <div className="space-y-4">
            <div>
              <label className="text-caption mb-2 block">You Pay</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  className="flex-1 bg-black/50 border-border/50 text-lg font-mono"
                />
                <Select defaultValue="usdc">
                  <SelectTrigger className="w-28 bg-black/50 border-border/50 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usdc">USDC</SelectItem>
                    <SelectItem value="eth">ETH</SelectItem>
                    <SelectItem value="btc">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center">
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 hover:bg-primary/20">
                <ArrowDownUp className="h-4 w-4 text-primary" />
              </Button>
            </div>

            <div>
              <label className="text-caption mb-2 block">You Receive</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  className="flex-1 bg-black/50 border-border/50 text-lg font-mono"
                  readOnly
                />
                <Select defaultValue="eth">
                  <SelectTrigger className="w-28 bg-black/50 border-border/50 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eth">ETH</SelectItem>
                    <SelectItem value="btc">BTC</SelectItem>
                    <SelectItem value="sol">SOL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full mt-4 bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium tracking-tight">
              Execute Swap
            </Button>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Recent Trades</h2>
          <div className="space-y-3">
            {[
              { pair: "ETH/USDC", side: "Buy", amount: "$1,200", price: "$3,245.80", time: "2m ago" },
              { pair: "BTC/USDC", side: "Sell", amount: "$5,500", price: "$98,420.00", time: "15m ago" },
              { pair: "SOL/USDC", side: "Buy", amount: "$800", price: "$178.45", time: "1h ago" },
            ].map((trade, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  {trade.side === "Buy" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <div>
                    <p className="font-mono font-medium text-sm">{trade.pair}</p>
                    <p className="text-caption">{trade.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono font-medium text-sm ${trade.side === "Buy" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {trade.amount}
                  </p>
                  <p className="text-caption font-mono">{trade.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
