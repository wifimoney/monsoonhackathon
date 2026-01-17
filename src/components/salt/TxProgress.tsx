'use client';

import { TxStage, STAGE_LABELS, STAGE_COLORS } from '@/salt/transaction-tracker';

const STAGES: TxStage[] = ['proposed', 'policy_check', 'signing', 'broadcasting', 'confirmed'];

interface Props {
    currentStage: TxStage;
    className?: string;
}

export function TxProgress({ currentStage, className = '' }: Props) {
    const currentIndex = STAGES.indexOf(currentStage);
    const isDenied = currentStage === 'denied';
    const isFailed = currentStage === 'failed';

    // Show error state for denied/failed
    if (isDenied || isFailed) {
        return (
            <div className={`rounded-lg p-4 ${isDenied ? 'bg-[var(--danger)]/10' : 'bg-yellow-500/10'} ${className}`}>
                <div className="flex items-center justify-center gap-2">
                    <span className={`text-2xl ${isDenied ? 'text-[var(--danger)]' : 'text-yellow-400'}`}>
                        {isDenied ? '✕' : '⚠'}
                    </span>
                    <span className={`font-semibold ${isDenied ? 'text-[var(--danger)]' : 'text-yellow-400'}`}>
                        {STAGE_LABELS[currentStage]}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-lg p-4 bg-[var(--card)] border border-[var(--card-border)] ${className}`}>
            {/* Progress bar */}
            <div className="flex items-center justify-between mb-3">
                {STAGES.map((stage, i) => {
                    const isComplete = i < currentIndex;
                    const isCurrent = i === currentIndex;

                    return (
                        <div key={stage} className="flex items-center flex-1">
                            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-300
                ${isComplete ? 'bg-[var(--accent)] text-black' : ''}
                ${isCurrent ? `${STAGE_COLORS[stage]} text-white animate-pulse` : ''}
                ${!isComplete && !isCurrent ? 'bg-[var(--card-border)] text-[var(--muted)]' : ''}
              `}>
                                {isComplete ? '✓' : i + 1}
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className={`flex-1 h-1 mx-1 rounded transition-all duration-300 ${isComplete ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'
                                    }`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Current stage label */}
            <div className="text-center">
                <span className="text-sm text-[var(--muted)]">
                    {STAGE_LABELS[currentStage]}
                </span>
            </div>
        </div>
    );
}
