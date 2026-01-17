'use client';

interface Props {
    halted: boolean;
    onTrigger: () => void;
    onReset: () => void;
}

export function LossGuardianCard({ halted, onTrigger, onReset }: Props) {
    return (
        <div className={`card col-span-full ${halted ? 'border-red-700 bg-red-900/10' : ''}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🛑</span>
                    <div>
                        <h4 className="text-sm font-medium text-white">Loss Guardian (Kill Switch)</h4>
                        <p className="text-xs text-[var(--muted)]">
                            Halts all trading if drawdown limit is breached
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium px-3 py-1 rounded ${halted
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-green-900/50 text-green-400'
                        }`}>
                        {halted ? '⛔ HALTED' : '✅ Active'}
                    </span>

                    {halted ? (
                        <button
                            onClick={onReset}
                            className="text-sm px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                            Resume Trading
                        </button>
                    ) : (
                        <button
                            onClick={onTrigger}
                            className="text-sm px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-400 rounded border border-red-700 transition-colors"
                        >
                            Trigger Test
                        </button>
                    )}
                </div>
            </div>

            {halted && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                    <p className="text-red-400 text-sm">
                        ⚠️ All trading is currently halted due to drawdown limit breach.
                        Click "Resume Trading" to re-enable automation.
                    </p>
                </div>
            )}
        </div>
    );
}
