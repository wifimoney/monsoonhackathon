"use client"

import type React from "react"

import { useState } from "react"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Shield, TrendingDown, Users, Zap, Lock, Eye, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface Guardian {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  active: boolean
}

const initialGuardians: Guardian[] = [
  {
    id: "1",
    title: "Max Drawdown Protection",
    description: "Automatically stops trading if portfolio drawdown exceeds 15%",
    icon: <TrendingDown className="h-5 w-5" />,
    active: true,
  },
  {
    id: "2",
    title: "Whitelist Only",
    description: "Only allows trades on pre-approved token pairs",
    icon: <Users className="h-5 w-5" />,
    active: true,
  },
  {
    id: "3",
    title: "Rate Limiter",
    description: "Limits trade frequency to prevent overtrading",
    icon: <Zap className="h-5 w-5" />,
    active: false,
  },
  {
    id: "4",
    title: "Position Size Cap",
    description: "Enforces maximum position size per trade",
    icon: <Lock className="h-5 w-5" />,
    active: true,
  },
  {
    id: "5",
    title: "Slippage Guard",
    description: "Rejects trades with slippage above threshold",
    icon: <Eye className="h-5 w-5" />,
    active: true,
  },
  {
    id: "6",
    title: "Gas Price Monitor",
    description: "Delays execution when gas prices spike",
    icon: <Shield className="h-5 w-5" />,
    active: false,
  },
]

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState(initialGuardians)

  const toggleGuardian = (id: string) => {
    setGuardians(guardians.map((g) => (g.id === id ? { ...g, active: !g.active } : g)))
  }

  const activeCount = guardians.filter((g) => g.active).length

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DataCard
          title="Active Guardians"
          value={activeCount}
          subtitle={`${guardians.length - activeCount} inactive`}
        />
        <DataCard title="Total Value Protected" value="$124,500" subtitle="Across all positions" />
        <DataCard title="Interventions (24h)" value="3" subtitle="2 blocked, 1 warning" />
      </div>

      {/* Guardian Cards Grid */}
      <div>
        <h2 className="mb-4">Policy Guardians</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className={cn(
                "rounded-xl border bg-card/50 p-5 transition-all",
                guardian.active ? "border-primary/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]" : "border-border/50",
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    guardian.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {guardian.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 rounded-full", guardian.active ? "bg-emerald-400" : "bg-muted-foreground")}
                  />
                  <Switch checked={guardian.active} onCheckedChange={() => toggleGuardian(guardian.id)} />
                </div>
              </div>
              <h3 className="mt-4">{guardian.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{guardian.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full border-border/50 hover:bg-white/5 bg-transparent font-medium tracking-tight"
              >
                <Settings className="mr-2 h-3 w-3" />
                Configure
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
