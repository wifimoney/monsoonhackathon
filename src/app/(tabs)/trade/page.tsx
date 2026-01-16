'use client';

import { ChatTrader } from '@/components/chat/ChatTrader';

export default function TradePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Trade</h2>
                <p className="text-[var(--muted)] mt-1">
                    Chat-driven trading with AI intent classification and policy enforcement
                </p>
            </div>

            {/* Main Content */}
            <ChatTrader />
        </div>
    );
}
