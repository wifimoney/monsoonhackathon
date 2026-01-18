"use client"

import { useState, useEffect } from "react"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Settings, Save, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type GuardiansConfig,
  type GuardianPreset,
  type StrategyPresetType,
  type GuardianType,
  GUARDIAN_PRESETS,
  GUARDIAN_INFO
} from "@/guardians/types"
import { StrategySelector } from "@/components/guardians/StrategySelector"
import { GuardianConfigDialog } from "@/components/guardians/GuardianConfigDialog"
import { toast } from "sonner"

export default function GuardiansPage() {
  // Config State
  const [activePreset, setActivePreset] = useState<GuardianPreset | 'custom'>('default');
  const [config, setConfig] = useState<GuardiansConfig>(GUARDIAN_PRESETS.default);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyPresetType | null>(null);

  // Persistence State
  const [session, setSession] = useState<{ authenticated: boolean; activeOrgId: string; activeAccountId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog State
  const [configuringGuardian, setConfiguringGuardian] = useState<GuardianType | null>(null);

  // Stats State
  const activeCount = Object.values(config).filter((c: any) => c?.enabled).length;

  // 1. Fetch Session & Config
  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await fetch('/api/salt/session');
        const sessionData = await sessionRes.json();
        setSession(sessionData);

        if (sessionData.authenticated && sessionData.activeOrgId && sessionData.activeAccountId) {
          const configRes = await fetch(`/api/guardrails?orgId=${sessionData.activeOrgId}&accountId=${sessionData.activeAccountId}`);
          const savedConfig = await configRes.json();

          if (savedConfig && Object.keys(savedConfig).length > 0) {
            setConfig(savedConfig);
            setActivePreset('custom');
            console.log("Loaded saved config");
          }
        }
      } catch (e) {
        console.error("Failed to init guardians", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Helper to save current config to DB
  const saveToDb = async (newConfig: GuardiansConfig) => {
    if (!session?.authenticated) return;
    setIsSaving(true);
    try {
      await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: session.activeOrgId,
          accountId: session.activeAccountId,
          config: newConfig
        })
      });
      toast.success("Policy Updated", { description: "Changes persisted to Salt Guardrails." });
    } catch (e) {
      toast.error("Failed to save policy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStrategySelect = (strategy: StrategyPresetType) => {
    setSelectedStrategy(strategy);
    setActivePreset(strategy);
    const newConfig = GUARDIAN_PRESETS[strategy];
    setConfig(newConfig);
    saveToDb(newConfig); // Auto-save on preset selection
  };

  const toggleGuardian = (type: GuardianType) => {
    setActivePreset('custom');
    setSelectedStrategy(null);

    const newConfig = {
      ...config,
      [type]: {
        ...config[type],
        enabled: !config[type].enabled
      }
    };

    setConfig(newConfig);
    saveToDb(newConfig);
  };

  const handleSaveConfig = (type: GuardianType, newSettings: any) => {
    setActivePreset('custom');
    setSelectedStrategy(null);

    const newConfig = {
      ...config,
      [type]: newSettings
    };

    setConfig(newConfig);
    saveToDb(newConfig);
  };

  // Helper to get guardian status from config
  const getGuardianStatus = (type: GuardianType) => {
    return (config[type] as { enabled: boolean })?.enabled ?? false;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DataCard
          title="Active Guardians"
          value={activeCount}
          subtitle={`${Object.keys(GUARDIAN_INFO).length - activeCount} inactive`}
        />
        <DataCard title="Total Value Protected" value="$124,500" subtitle="Across all positions" />
        <DataCard title="Interventions (24h)" value="0" subtitle="0 blocked" />
      </div>

      {/* Strategy Selection */}
      <StrategySelector
        selectedStrategy={selectedStrategy}
        onSelect={handleStrategySelect}
      />

      {/* Active Configuration */}
      <div>
        <div className="flex items-center justify-between mb-4 mt-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Active Configuration
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h2>
          {activePreset === 'custom' && (
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
              CUSTOM CONFIGURATION
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(GUARDIAN_INFO) as [GuardianType, typeof GUARDIAN_INFO[GuardianType]][]).map(([type, info]) => {
            const isActive = getGuardianStatus(type);

            return (
              <div
                key={type}
                className={cn(
                  "rounded-xl border bg-card/50 p-5 transition-all relative overflow-hidden",
                  isActive
                    ? "border-primary/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
                    : "border-border/50 opacity-80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg text-xl",
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {info.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 rounded-full", isActive ? "bg-emerald-400" : "bg-muted-foreground")}
                    />
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => toggleGuardian(type)}
                      disabled={!session?.authenticated}
                    />
                  </div>
                </div>

                <h3 className="mt-4 font-medium flex items-center gap-2">
                  {info.name}
                  {info.saltNative && (
                    <span className="text-[9px] uppercase tracking-wider bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded">
                      Native
                    </span>
                  )}
                </h3>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground h-10">
                  {info.description}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full border-border/50 hover:bg-white/5 bg-transparent font-medium tracking-tight"
                  onClick={() => setConfiguringGuardian(type)}
                  disabled={!session?.authenticated}
                >
                  <Settings className="mr-2 h-3 w-3" />
                  Configure
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <GuardianConfigDialog
        open={!!configuringGuardian}
        onOpenChange={(open) => !open && setConfiguringGuardian(null)}
        type={configuringGuardian}
        config={configuringGuardian ? config[configuringGuardian] : {}}
        onSave={handleSaveConfig}
      />
    </div>
  )
}
