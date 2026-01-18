"use client"

import { useState } from "react"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const asks = [
  { price: "3,248.50", size: "2.450", total: "7,958.83" },
  { price: "3,247.80", size: "1.200", total: "3,897.36" },
  { price: "3,247.20", size: "5.800", total: "18,833.76" },
  { price: "3,246.90", size: "0.890", total: "2,889.74" },
  { price: "3,246.50", size: "3.210", total: "10,421.27" },
]

const bids = [
  { price: "3,245.80", size: "4.120", total: "13,372.70" },
  { price: "3,245.20", size: "1.890", total: "6,133.43" },
  { price: "3,244.80", size: "6.540", total: "21,220.99" },
  { price: "3,244.10", size: "2.100", total: "6,812.61" },
  { price: "3,243.50", size: "0.750", total: "2,432.63" },
]

export default function OrderbookPage() {
  const [orderType, setOrderType] = useState<"limit" | "market">("limit")
  const [side, setSide] = useState<"buy" | "sell">("buy")

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard title="ETH/USDC" value="$3,245.80" subtitle="+1.24%" />
        <DataCard title="24h Volume" value="$12.4M" subtitle="ETH/USDC" />
        <DataCard title="Open Orders" value="3" subtitle="$4,500 total" />
        <DataCard title="Spread" value="0.02%" subtitle="$0.70" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orderbook */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Order Book</h2>

          <div className="grid grid-cols-3 text-label mb-2 px-2">
            <span>Price (USDC)</span>
            <span className="text-center">Size (ETH)</span>
            <span className="text-right">Total (USDC)</span>
          </div>

          {/* Asks (Sells) */}
          <div className="space-y-1 mb-4">
            {asks.map((ask, i) => (
              <div key={i} className="grid grid-cols-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer relative">
                <div
                  className="absolute inset-y-0 right-0 bg-red-500/10"
                  style={{ width: `${Math.min(Number.parseFloat(ask.size) * 15, 100)}%` }}
                />
                <span className="text-red-400 font-mono text-sm relative z-10">{ask.price}</span>
                <span className="text-center font-mono text-sm relative z-10">{ask.size}</span>
                <span className="text-right text-muted-foreground font-mono text-sm relative z-10">{ask.total}</span>
              </div>
            ))}
          </div>

          {/* Spread */}
          <div className="flex items-center justify-center py-3 border-y border-border/30 my-4">
            <span className="text-2xl font-bold font-mono tracking-tight">3,245.80</span>
            <span className="ml-2 text-emerald-400 font-mono text-sm">+1.24%</span>
          </div>

          {/* Bids (Buys) */}
          <div className="space-y-1">
            {bids.map((bid, i) => (
              <div key={i} className="grid grid-cols-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer relative">
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-500/10"
                  style={{ width: `${Math.min(Number.parseFloat(bid.size) * 15, 100)}%` }}
                />
                <span className="text-emerald-400 font-mono text-sm relative z-10">{bid.price}</span>
                <span className="text-center font-mono text-sm relative z-10">{bid.size}</span>
                <span className="text-right text-muted-foreground font-mono text-sm relative z-10">{bid.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Form */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <Tabs defaultValue="limit" className="mb-4">
            <TabsList className="grid w-full grid-cols-2 bg-black/50">
              <TabsTrigger value="limit" onClick={() => setOrderType("limit")} className="font-medium tracking-tight">
                Limit
              </TabsTrigger>
              <TabsTrigger value="market" onClick={() => setOrderType("market")} className="font-medium tracking-tight">
                Market
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button
              variant={side === "buy" ? "default" : "outline"}
              className={cn("font-medium tracking-tight", side === "buy" && "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => setSide("buy")}
            >
              Buy
            </Button>
            <Button
              variant={side === "sell" ? "default" : "outline"}
              className={cn("font-medium tracking-tight", side === "sell" && "bg-red-600 hover:bg-red-700")}
              onClick={() => setSide("sell")}
            >
              Sell
            </Button>
          </div>

          <div className="space-y-4">
            {orderType === "limit" && (
              <div>
                <label className="text-caption mb-2 block">Price</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    defaultValue="3245.80"
                    className="bg-black/50 border-border/50 font-mono pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                    USDC
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-caption mb-2 block">Amount</label>
              <div className="relative">
                <Input type="number" placeholder="0.00" className="bg-black/50 border-border/50 font-mono pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                  ETH
                </span>
              </div>
            </div>

            <div>
              <label className="text-caption mb-2 block">Total</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  className="bg-black/50 border-border/50 font-mono pr-16"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                  USDC
                </span>
              </div>
            </div>

            <Button
              className={cn(
                "w-full font-medium tracking-tight",
                side === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
              )}
            >
              {side === "buy" ? "Buy ETH" : "Sell ETH"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
