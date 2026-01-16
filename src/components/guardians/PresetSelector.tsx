'use client';

import type { GuardianPreset } from '@/guardians/types';

interface Props {
    preset: GuardianPreset;
    onChange: (preset: GuardianPreset) => void;
}

const PRESETS: { value: GuardianPreset; label: string; description: string }[] = [
    { value: 'conservative', label: 'Conservative', description: '$100/trade, 1x max' },
    { value: 'default', label: 'Default', description: '$250/trade, 3x max' },
    { value: 'pro', label: 'Pro', description: '$500/trade, 5x max' },
];

export function PresetSelector({ preset, onChange }: Props) {
    return (
        <div className="flex gap-2">
            {PRESETS.map((p) => (
                <button
                    key={p.value}
                    onClick={() => onChange(p.value)}
                    className={`flex-1 p-3 rounded-lg text-center transition-all border ${preset === p.value
                            ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-white'
                            : 'bg-black/30 border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:border-[var(--muted)]'
                        }`}
                >
                    <p className="font-medium text-sm">{p.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{p.description}</p>
                </button>
            ))}
        </div>
    );
}
