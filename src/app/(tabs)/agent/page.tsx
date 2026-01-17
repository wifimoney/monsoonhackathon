'use client';

import { useState, useCallback } from 'react';
import { PendingActionsQueue } from '@/components/approvals/PendingActionsQueue';
import { AgentActionCards } from '@/components/approvals/AgentActionCards';

export default function AgentPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleActionUpdate = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">🤖 Robo Manager</h1>
                <p className="text-muted mt-1">
                    Human-in-the-loop approvals for automated trading actions
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Action Cards */}
                <div className="lg:col-span-2">
                    <AgentActionCards onPropose={handleActionUpdate} />
                </div>

                {/* Right: Pending Queue */}
                <div className="lg:col-span-1">
                    <PendingActionsQueue
                        key={refreshTrigger}
                        onActionUpdate={handleActionUpdate}
                    />
                </div>
            </div>

            {/* How it works */}
            <div className="card bg-zinc-900/50">
                <h3 className="text-sm font-medium mb-3">How Human-in-the-Loop Works</h3>
                <div className="grid grid-cols-4 gap-4 text-center text-xs">
                    <div>
                        <div className="text-2xl mb-1">1️⃣</div>
                        <div className="text-muted">Agent or User proposes action</div>
                    </div>
                    <div>
                        <div className="text-2xl mb-1">2️⃣</div>
                        <div className="text-muted">Policy check runs automatically</div>
                    </div>
                    <div>
                        <div className="text-2xl mb-1">3️⃣</div>
                        <div className="text-muted">Human reviews & approves</div>
                    </div>
                    <div>
                        <div className="text-2xl mb-1">4️⃣</div>
                        <div className="text-muted">Salt executes transaction</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
