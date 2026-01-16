'use client';

import { useState } from 'react';
import type { GuardianType, GuardianDenial } from '@/guardians/types';
import { GUARDIAN_INFO } from '@/guardians/types';

interface Props {
    guardian: GuardianType;
    enabled: boolean;
    settings: React.ReactNode;
    onToggle: (enabled: boolean) => void;
    onTest: () => void;
    lastDenial?: GuardianDenial | null;
}

export function GuardianCard({
    guardian,
    enabled,
    settings,
    onToggle,
    onTest,
    lastDenial,
}: Props) {
    const [testing, setTesting] = useState(false);
    const info = GUARDIAN_INFO[guardian];

    const handleTest = async () => {
        setTesting(true);
        await onTest();
        setTimeout(() => setTesting(false), 2000);
    };

    return (
        <div className={`card transition-all ${!enabled ? 'opacity-60' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                        <h4 className="text-sm font-medium text-white">{info.name}</h4>
                        <p className="text-xs text-[var(--muted)]">{info.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {info.saltNative && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded">
                            Salt
                        </span>
                    )}
                    <button
                        onClick={() => onToggle(!enabled)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${enabled ? 'bg-green-600' : 'bg-zinc-700'
                            }`}
                    >
                        <span className={`
              absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform
              ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
            `} />
                    </button>
                </div>
            </div>

            {/* Settings */}
            {enabled && (
                <div className="pt-3 border-t border-[var(--card-border)]">
                    {settings}
                </div>
            )}

            {/* Last denial */}
            {lastDenial && (
                <div className="mt-3 p-2 bg-red-900/20 border border-red-800/50 rounded text-xs">
                    <p className="text-red-400">🚫 {lastDenial.reason}</p>
                </div>
            )}

            {/* Test button */}
            <div className="mt-3 flex justify-end">
                <button
                    onClick={handleTest}
                    disabled={!enabled || testing}
                    className={`text-xs px-3 py-1.5 rounded transition-colors ${testing
                            ? 'bg-red-900/50 text-red-400'
                            : enabled
                                ? 'bg-[var(--card-border)] text-[var(--muted)] hover:text-white hover:bg-zinc-700'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`}
                >
                    {testing ? '🚫 Blocked!' : 'Test Denial'}
                </button>
            </div>
        </div>
    );
}
