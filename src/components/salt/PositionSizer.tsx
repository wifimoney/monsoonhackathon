'use client';

interface Constraint {
    name: string;
    limit: number;
    remaining: number;
    constrains: boolean;
}

interface PositionSizeRecommendation {
    recommendedSize: number;
    maxAllowedSize: number;
    reasoning: string[];
    constraints: Constraint[];
    riskAdjustment?: {
        applied: boolean;
        factor: number;
        reason: string;
    };
}

interface Props {
    recommendation: PositionSizeRecommendation | null;
    currentSize: number;
    onSizeChange: (size: number) => void;
}

export function PositionSizer({ recommendation, currentSize, onSizeChange }: Props) {
    if (!recommendation) {
        return (
            <div className="card">
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Smart Position Sizing</h3>
                <p className="text-[var(--muted)] text-xs">Select a market to see recommendations</p>
            </div>
        );
    }

    const { recommendedSize, maxAllowedSize, constraints, reasoning, riskAdjustment } = recommendation;
    const sizePercentOfMax = maxAllowedSize > 0 ? (currentSize / maxAllowedSize) * 100 : 0;

    return (
        <div className="card">
            <h3 className="text-sm font-medium text-white mb-3">Smart Position Sizing</h3>

            {/* Recommended size highlight */}
            <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-400 text-xs">Recommended Size</p>
                        <p className="text-white text-2xl font-bold">${recommendedSize}</p>
                    </div>
                    <button
                        onClick={() => onSizeChange(recommendedSize)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
                    >
                        Use
                    </button>
                </div>
            </div>

            {/* Size slider with constraints */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                    <span>$0</span>
                    <span>Max: ${maxAllowedSize}</span>
                </div>
                <div className="relative">
                    <input
                        type="range"
                        min={0}
                        max={maxAllowedSize}
                        step={5}
                        value={Math.min(currentSize, maxAllowedSize)}
                        onChange={(e) => onSizeChange(parseInt(e.target.value))}
                        className="w-full accent-[var(--primary)]"
                    />
                    {/* Recommended marker */}
                    {maxAllowedSize > 0 && (
                        <div
                            className="absolute top-0 w-0.5 h-4 bg-blue-500 -mt-1 pointer-events-none"
                            style={{ left: `${(recommendedSize / maxAllowedSize) * 100}%` }}
                        />
                    )}
                </div>
                <div className="text-center mt-2">
                    <span className="text-white text-lg font-bold">${currentSize}</span>
                    <span className="text-[var(--muted)] text-sm ml-2">
                        ({sizePercentOfMax.toFixed(0)}% of max)
                    </span>
                </div>
            </div>

            {/* Constraints breakdown */}
            <div className="space-y-2 mb-4">
                {constraints.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                        <span className={c.constrains ? 'text-yellow-400' : 'text-[var(--muted)]'}>
                            {c.constrains && '⚠️ '}{c.name}
                        </span>
                        <span className="text-[var(--muted)] font-mono">
                            ${c.remaining.toFixed(0)} left
                        </span>
                    </div>
                ))}
            </div>

            {/* Risk adjustment note */}
            {riskAdjustment?.applied && (
                <div className="p-2 bg-yellow-900/20 border border-yellow-800/50 rounded text-xs mb-3">
                    <p className="text-yellow-400">
                        ⚡ {riskAdjustment.reason}
                    </p>
                </div>
            )}

            {/* Reasoning */}
            {reasoning.length > 0 && (
                <div className="pt-3 border-t border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)]">
                        {reasoning.join(' • ')}
                    </p>
                </div>
            )}
        </div>
    );
}
