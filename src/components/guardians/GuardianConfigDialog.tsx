import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { GuardianType, GUARDIAN_INFO } from "@/guardians/types";

interface GuardianConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: GuardianType | null;
    config: any;
    onSave: (type: GuardianType, newConfig: any) => void;
}

export function GuardianConfigDialog({ open, onOpenChange, type, config, onSave }: GuardianConfigDialogProps) {
    const [localConfig, setLocalConfig] = useState<any>({});

    useEffect(() => {
        if (config) {
            setLocalConfig({ ...config });
        }
    }, [config, type, open]);

    if (!type) return null;

    const info = GUARDIAN_INFO[type];

    const handleSave = () => {
        onSave(type, localConfig);
        onOpenChange(false);
    };

    const updateField = (field: string, value: any) => {
        setLocalConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] border-zinc-800 bg-zinc-950 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">{info.icon}</span>
                        Configure {info.name}
                    </DialogTitle>
                    <DialogDescription>
                        Customize the parameters for this guardian. Changes will switch your active preset to "Custom".
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="enabled">Enabled</Label>
                        <Switch
                            id="enabled"
                            checked={localConfig.enabled}
                            onCheckedChange={(c) => updateField('enabled', c)}
                        />
                    </div>

                    {/* DYNAMIC FORM FIELDS BASED ON TYPE */}

                    {/* LEVERAGE GUARDIAN */}
                    {type === 'leverage' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Max Leverage</Label>
                                    <span className="font-mono text-primary">{localConfig.maxLeverage}x</span>
                                </div>
                                <Slider
                                    defaultValue={[localConfig.maxLeverage || 1]}
                                    value={[localConfig.maxLeverage]}
                                    min={1}
                                    max={100}
                                    step={1}
                                    onValueChange={(v) => updateField('maxLeverage', v[0])}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Maximum allowed leverage per trade.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SPEND GUARDIAN */}
                    {type === 'spend' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Max Per Trade ($)</Label>
                                    <Input
                                        type="number"
                                        value={localConfig.maxPerTrade}
                                        onChange={(e) => updateField('maxPerTrade', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Daily ($)</Label>
                                    <Input
                                        type="number"
                                        value={localConfig.maxDaily}
                                        onChange={(e) => updateField('maxDaily', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPOSURE GUARDIAN */}
                    {type === 'exposure' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Max Exposure Per Asset ($)</Label>
                                <Input
                                    type="number"
                                    value={localConfig.maxPerAsset}
                                    onChange={(e) => updateField('maxPerAsset', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {/* RATE GUARDIAN */}
                    {type === 'rate' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Max Trades / Day</Label>
                                    <Input
                                        type="number"
                                        value={localConfig.maxPerDay}
                                        onChange={(e) => updateField('maxPerDay', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cooldown (sec)</Label>
                                    <Input
                                        type="number"
                                        value={localConfig.cooldownSeconds}
                                        onChange={(e) => updateField('cooldownSeconds', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LOSS GUARDIAN */}
                    {type === 'loss' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Max Drawdown ($)</Label>
                                <Input
                                    type="number"
                                    value={localConfig.maxDrawdown}
                                    onChange={(e) => updateField('maxDrawdown', Number(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Trading halts if daily loss exceeds this amount.
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
