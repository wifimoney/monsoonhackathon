"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount, useSwitchChain } from "wagmi"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// HyperEVM Testnet Chain ID
const REQUIRED_CHAIN_ID = 998

interface OrderLevel {
  price: string
  size: string
  total: string
}

interface Orderbook {
  asset: string
  timestamp: number
  bids: OrderLevel[]
  asks: OrderLevel[]
  midPrice: string
  spread: { absolute: string; percentage: string }
  isMock?: boolean
}

interface OrderResult {
  success: boolean
  orderId?: string
  filledPrice?: number
  filledSize?: number
  status?: string
  error?: string
  denials?: any[]
}

const ASSETS = ['HYPE', 'ETH', 'BTC', 'SOL', 'ARB']

export default function OrderbookPage() {
  const { isConnected, chain } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const [orderType, setOrderType] = useState<"limit" | "market">("limit")
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [selectedAsset, setSelectedAsset] = useState("HYPE")
  const [price, setPrice] = useState("")
  const [amount, setAmount] = useState("")

  // Orderbook data
  const [orderbook, setOrderbook] = useState<Orderbook | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if on correct chain
  const isWrongChain = isConnected && chain?.id !== REQUIRED_CHAIN_ID

  // Show chain switch prompt if on wrong chain
  if (isWrongChain) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Wrong Network</h2>
          <p className="text-muted-foreground mb-4">
            You're connected to <span className="font-mono text-yellow-400">{chain?.name || `Chain ${chain?.id}`}</span>.
            <br />
            Please switch to <span className="font-mono text-primary">HyperEVM Testnet</span> to use the Orderbook.
          </p>
          <Button
            onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
            disabled={isSwitching}
            className="bg-primary hover:bg-primary/90"
          >
            {isSwitching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch to HyperEVM Testnet"
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Order submission
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)

  // Fetch orderbook data
  const fetchOrderbook = useCallback(async () => {
    try {
      const res = await fetch(`/api/orderbook?asset=${selectedAsset}`)
      const data = await res.json()
      setOrderbook(data)

      // Set default price to mid price
      if (!price && data.midPrice) {
        setPrice(data.midPrice)
      }
    } catch (error) {
      console.error('Failed to fetch orderbook:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAsset, price])

  // Initial fetch and polling
  useEffect(() => {
    fetchOrderbook()
    const interval = setInterval(fetchOrderbook, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [fetchOrderbook])

  // Handle asset change
  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset)
    setPrice("")
    setLoading(true)
  }

  // Calculate total
  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : ""

  // Submit order with guardian check
  const handleSubmitOrder = async () => {
    if (!amount || (orderType === 'limit' && !price)) return

    setSubmitting(true)
    setOrderResult(null)

    try {
      const res = await fetch('/api/orderbook/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: selectedAsset,
          side,
          orderType,
          price: orderType === 'limit' ? parseFloat(price) : undefined,
          size: parseFloat(amount)
        })
      })

      const result: OrderResult = await res.json()
      setOrderResult(result)

      if (result.success) {
        setAmount("")
      }
    } catch (error: any) {
      setOrderResult({ success: false, error: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  // Click on orderbook row to set price
  const handleRowClick = (rowPrice: string) => {
    setPrice(rowPrice.replace(/,/g, ''))
  }

  if (loading && !orderbook) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Orderbook Panel */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border/50 bg-black/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              Order Book <span className="text-muted-foreground text-xs font-normal font-mono">({selectedAsset}/USD)</span>
            </h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-muted-foreground">Spread: {orderbook?.spread.absolute} ({orderbook?.spread.percentage}%)</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Live
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium mb-2 px-2">
            <span>Price (USD)</span>
            <span className="text-center">Size ({selectedAsset})</span>
            <span className="text-right">Total (USD)</span>
          </div>

          {/* Asks (Sells) */}
          <div className="space-y-1 min-h-[200px] flex flex-col justify-end">
            {orderbook?.asks.slice().reverse().map((ask, i) => (
              <div
                key={`ask-${i}`}
                className="grid grid-cols-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer relative group"
                onClick={() => handleRowClick(ask.price)}
              >
                <div
                  className="absolute inset-y-0 right-0 bg-red-500/10 pointer-events-none"
                  style={{ width: `${Math.min(parseFloat(ask.size) * 10, 100)}%` }}
                />
                <span className="text-red-400 font-mono text-sm relative z-10">{ask.price}</span>
                <span className="text-center font-mono text-sm relative z-10">{ask.size}</span>
                <span className="text-right text-muted-foreground font-mono text-sm relative z-10">{ask.total}</span>
              </div>
            ))}
          </div>

          {/* Spread / Mid Price */}
          <div className="flex items-center justify-center py-3 border-y border-border/30 my-4 bg-white/5">
            <span className={`text-2xl font-bold font-mono tracking-tight ${parseFloat(orderbook?.midPrice || "0") > parseFloat(price || "0") ? 'text-emerald-400' : 'text-red-400'
              }`}>
              {orderbook?.midPrice || "0.00"}
            </span>
            <span className="ml-2 text-muted-foreground text-xs">Mid Price</span>
          </div>

          {/* Bids (Buys) */}
          <div className="space-y-1 min-h-[200px]">
            {orderbook?.bids.map((bid, i) => (
              <div
                key={`bid-${i}`}
                className="grid grid-cols-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer relative group"
                onClick={() => handleRowClick(bid.price)}
              >
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-500/10 pointer-events-none"
                  style={{ width: `${Math.min(parseFloat(bid.size) * 10, 100)}%` }}
                />
                <span className="text-emerald-400 font-mono text-sm relative z-10">{bid.price}</span>
                <span className="text-center font-mono text-sm relative z-10">{bid.size}</span>
                <span className="text-right text-muted-foreground font-mono text-sm relative z-10">{bid.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>   {/* Order Form */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        {/* Guardian Badge */}
        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs text-primary">Guardian Protected</span>
        </div>

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
                  defaultValue={orderbook?.midPrice || "3000.00"}
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
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/50 border-border/50 font-mono pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                {selectedAsset}
              </span>
            </div>
          </div>

          <div>
            <label className="text-caption mb-2 block">Total</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="0.00"
                value={total}
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
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Guardians...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {side === "buy" ? "Buy" : "Sell"} {selectedAsset}
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Trading enabled via Agent Chat only
          </p>
        </div>
      </div>
    </div>
  )
}
