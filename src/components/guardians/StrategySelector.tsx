import { type StrategyPresetType, STRATEGY_PRESET_INFO } from "@/guardians/types";
import { cn } from "@/lib/utils";
import { Check, Info } from "lucide-react";

interface StrategySelectorProps {
    selectedStrategy: StrategyPresetType | null;
    onSelect: (strategy: StrategyPresetType) => void;
}

export function StrategySelector({ selectedStrategy, onSelect }: StrategySelectorProps) {
    const strategies = Object.entries(STRATEGY_PRESET_INFO) as [StrategyPresetType, typeof STRATEGY_PRESET_INFO[StrategyPresetType]][];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Salt Roboguardians</h2>
                <span className="text-sm text-muted-foreground">Select a strategy to auto-configure guardians</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {strategies.map(([key, info]) => {
                    const isSelected = selectedStrategy === key;

                    return (
                        <div
                            key={key}
                            onClick={() => onSelect(key)}
                            className={cn(
                                "cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden group",
                                isSelected
                                    ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(220,38,38,0.1)]"
                                    : "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/80"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute top-2 right-2 text-primary">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}

                            <div className="text-2xl mb-3">{info.icon}</div>

                            <h3 className={cn("font-medium mb-1", isSelected ? "text-primary" : "text-foreground")}>
                                {info.name}
                            </h3>

                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 h-10 line-clamp-2">
                                {info.description}
                            </p>

                            <div className="space-y-1.5">
                                {info.keyPolicies.slice(0, 2).map((policy, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground/80 bg-black/20 p-1.5 rounded">
                                        <Info className="w-3 h-3 text-primary/70" />
                                        <span className="truncate">{policy}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
