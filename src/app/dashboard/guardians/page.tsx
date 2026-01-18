"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Shield, TrendingDown, Users, Zap, Lock, Eye, Settings, Save, Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Guardian {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  active: boolean
}

const defaultGuardians: Guardian[] = [
  {
    id: "maxDrawdown",
    title: "Max Drawdown Protection",
    description: "Automatically stops trading if portfolio drawdown exceeds 15%",
    icon: <TrendingDown className="h-5 w-5" />,
    active: true,
  },
  {
    id: "whitelistOnly",
    title: "Whitelist Only",
    description: "Only allows trades on pre-approved token pairs",
    icon: <Users className="h-5 w-5" />,
    active: true,
  },
  {
    id: "rateLimiter",
    title: "Rate Limiter",
    description: "Limits trade frequency to prevent overtrading",
    icon: <Zap className="h-5 w-5" />,
    active: false,
  },
  {
    id: "positionSizeCap",
    title: "Position Size Cap",
    description: "Enforces maximum position size per trade",
    icon: <Lock className="h-5 w-5" />,
    active: true,
  },
  {
    id: "slippageGuard",
    title: "Slippage Guard",
    description: "Rejects trades with slippage above threshold",
    icon: <Eye className="h-5 w-5" />,
    active: true,
  },
  {
    id: "maxLeverage",
    title: "Max Leverage Limit",
    description: "Caps leverage to prevent excessive risk",
    icon: <Shield className="h-5 w-5" />,
    active: false,
  },
]

// Icon map for restoring icons from saved config
const iconMap: Record<string, React.ReactNode> = {
  maxDrawdown: <TrendingDown className="h-5 w-5" />,
  whitelistOnly: <Users className="h-5 w-5" />,
  rateLimiter: <Zap className="h-5 w-5" />,
  positionSizeCap: <Lock className="h-5 w-5" />,
  slippageGuard: <Eye className="h-5 w-5" />,
  maxLeverage: <Shield className="h-5 w-5" />,
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState(defaultGuardians)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)

  // Load session and saved config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        // Get session info
        const sessionRes = await fetch('/api/salt/session')
        const session = await sessionRes.json()

        if (session.activeOrgId && session.activeAccountId) {
          setOrgId(session.activeOrgId)
          setAccountId(session.activeAccountId)

          // Load saved guardrails config
          const configRes = await fetch(`/api/guardrails?orgId=${session.activeOrgId}&accountId=${session.activeAccountId}`)
          const config = await configRes.json()

          if (config && config.guardians && Array.isArray(config.guardians)) {
            // Merge saved state with defaults (to restore icons and any new guardians)
            const mergedGuardians = defaultGuardians.map(g => {
              const saved = config.guardians.find((s: any) => s.id === g.id)
              return saved ? { ...g, active: saved.active } : g
            })
            setGuardians(mergedGuardians)
          }
        }
      } catch (error) {
        console.error('Failed to load guardian config:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  const toggleGuardian = (id: string) => {
    setGuardians(guardians.map((g) => (g.id === id ? { ...g, active: !g.active } : g)))
    setHasChanges(true)
    setSaved(false)
  }

  const saveConfig = async () => {
    if (!orgId || !accountId) {
      console.error('No session available')
      return
    }

    setSaving(true)
    try {
      // Save only id and active state (icons are restored from iconMap)
      const configToSave = {
        guardians: guardians.map(g => ({ id: g.id, active: g.active }))
      }

      const res = await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          accountId,
          config: configToSave
        })
      })

      if (res.ok) {
        setHasChanges(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save guardian config:', error)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = guardians.filter((g) => g.active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

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
        <div className="flex items-center justify-between mb-4">
          <h2>Policy Guardians</h2>
          <Button
            onClick={saveConfig}
            disabled={saving || !hasChanges}
            className={cn(
              "gap-2",
              saved && "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
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
