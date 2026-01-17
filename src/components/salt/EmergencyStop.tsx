'use client';

import { useState } from 'react';

interface Props {
    onStop?: () => void;
}

export function EmergencyStop({ onStop }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [stopped, setStopped] = useState(false);

    const handleClick = () => {
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3000); // Reset after 3s
            return;
        }

        // Execute stop
        setStopped(true);
        onStop?.();

        // Reset after 5s
        setTimeout(() => {
            setStopped(false);
            setConfirming(false);
        }, 5000);
    };

    return (
        <button
            onClick={handleClick}
            disabled={stopped}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${stopped
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : confirming
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-red-900/50 text-red-400 border border-red-700 hover:bg-red-800'
                }`}
        >
            {stopped ? (
                <span className="flex items-center gap-2">
                    <span>⏹</span> Stopped
                </span>
            ) : confirming ? (
                <span className="flex items-center gap-2">
                    <span>⚠️</span> Click Again to Confirm
                </span>
            ) : (
                <span className="flex items-center gap-2">
                    <span>🛑</span> Emergency Stop
                </span>
            )}
        </button>
    );
}
