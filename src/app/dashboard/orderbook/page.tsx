"use client"

import { useState } from "react"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useOrderBook, useTicker } from "@/hooks/useHyperliquid"

export default function OrderbookPage() {
  const [orderType, setOrderType] = useState<"limit" | "market">("limit")
  const [side, setSide] = useState<"buy" | "sell">("buy")

  // Fetch real data
  const { data: orderBook, isLoading } = useOrderBook("ETH");
  const { price: currentPrice } = useTicker("ETH");

  const formatPrice = (p: string) => parseFloat(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatSize = (s: string) => parseFloat(s).toFixed(4);
  const calculateTotal = (p: string, s: string) => (parseFloat(p) * parseFloat(s)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Process asks (sells) - reverse to show lowest ask at bottom (closest to spread)
  // Hyperliquid returns [bids, asks]. bids are high to low, asks are low to high.
  // We want asks displayed from high to low usually in a vertical list, 
  // but typically orderbooks show:
  // ASKS (High -> Low)
  // SPREAD
  // BIDS (High -> Low)
  // Wait, standard vertical orderbook:
  // Asks: Highest Price ... Lowest Price (closest to spread)
  // Spread
  // Bids: Highest Price (closest to spread) ... Lowest Price

  // Hyperliquid asks are sorted by price inc (lowest first). 
  // So we probably want to slice the first 5 (lowest/best asks) and then reverse them for display 
  // so the lowest ask is at the bottom of the list, just above the spread.

  const asks = orderBook?.levels[1]?.slice(0, 5).reverse() || [];
  const bids = orderBook?.levels[0]?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard title="ETH/USDC" value={currentPrice ? `$${formatPrice(currentPrice)}` : "Loading..."} subtitle="HyperCore Oracle" />
        <DataCard title="24h Volume" value="$12.4M" subtitle="ETH/USDC" />
        <DataCard title="Open Orders" value="0" subtitle="$0.00 total" />
        <DataCard title="Spread" value="-" subtitle="Calculated" />
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
          <div className="space-y-1 mb-4 flex flex-col justify-end min-h-[160px]">
            {isLoading ? (
              <div className="text-center text-muted-foreground text-sm py-4">Loading asks...</div>
            ) : (
              asks.map((ask, i) => (
                <div key={i} className="grid grid-cols-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer relative">
                  <div
                    className="absolute inset-y-0 right-0 bg-red-500/10"
                    style={{ width: `${Math.min(Number.parseFloat(ask.sz) * 10, 100)}%` }}
                  />
                  <span className="text-red-400 font-mono text-sm relative z-10">{formatPrice(ask.px)}</span>
                  <span className="text-center font-mono text-sm relative z-10">{formatSize(ask.sz)}</span>
                  <span className="text-right text-muted-foreground font-mono text-sm relative z-10">{calculateTotal(ask.px, ask.sz)}</span>
                </div>
              ))
            )}
          </div>

          {/* Spread */}
          <div className="flex items-center justify-center py-3 border-y border-border/30 my-4">
            <span className="text-2xl font-bold font-mono tracking-tight">
              {currentPrice ? formatPrice(currentPrice) : "---.--"}
            </span>
            <span className="ml-2 text-emerald-400 font-mono text-sm">Oracle Price</span>
          </div>

          {/* Bids (Buys) */}
          <div className="space-y-1 min-h-[160px]">
            {isLoading ? (
              <div className="text-center text-muted-foreground text-sm py-4">Loading bids...</div>
            ) : (
              bids.map((bid, i) => (
                <div key={i} className="grid grid-cols-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer relative">
                  <div
                    className="absolute inset-y-0 right-0 bg-emerald-500/10"
                    style={{ width: `${Math.min(Number.parseFloat(bid.sz) * 10, 100)}%` }}
                  />
                  <span className="text-emerald-400 font-mono text-sm relative z-10">{formatPrice(bid.px)}</span>
                  <span className="text-center font-mono text-sm relative z-10">{formatSize(bid.sz)}</span>
                  <span className="text-right text-muted-foreground font-mono text-sm relative z-10">{calculateTotal(bid.px, bid.sz)}</span>
                </div>
              ))
            )}
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
              className={cn("font-medium tracking-tight", side === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : "")}
              onClick={() => setSide("buy")}
            >
              Buy
            </Button>
            <Button
              variant={side === "sell" ? "default" : "outline"}
              className={cn("font-medium tracking-tight", side === "sell" ? "bg-red-600 hover:bg-red-700" : "")}
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
                    defaultValue={currentPrice || "3000.00"}
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
              disabled={true} // Disabled for now as this is just visualization
              className={cn(
                "w-full font-medium tracking-tight",
                side === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
              )}
            >
              {side === "buy" ? "Buy ETH" : "Sell ETH"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Trading enabled via Agent Chat only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
