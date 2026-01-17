"use client"

import { useEffect, useState } from "react"

const stats = [
  { label: "AMM + ORDERBOOK ROUTING", value: "ENABLED" },
  { label: "POLICY-GATED EXECUTION", value: "ACTIVE" },
  { label: "HYPERLIQUID NATIVE ORACLE", value: "INTEGRATED" },
  { label: "CROSS-CHAIN SETTLEMENT", value: "LIVE" },
  { label: "MEV PROTECTION", value: "ON" },
  { label: "ZERO-SLIPPAGE SWAPS", value: "SUPPORTED" },
]

export function StatsTicker() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => prev - 0.5)
    }, 30)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10 overflow-hidden">
      <div
        className="flex items-center gap-12 py-4 whitespace-nowrap font-mono text-xs tracking-wider"
        style={{
          transform: `translateX(${offset}px)`,
        }}
      >
        {[...stats, ...stats, ...stats].map((stat, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase">{stat.label}:</span>
            <span className="text-foreground font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
