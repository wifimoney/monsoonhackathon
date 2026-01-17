'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ActionIntent, MarketMatch, GuardrailsResult } from '@/agent/types';

interface Props {
    messages: ChatMessage[];
    isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-black/50 text-white border border-[var(--card-border)]'
                            }`}
                    >
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>

                        {/* Show matched markets */}
                        {msg.data?.matches && msg.data.matches.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-xs text-white/60 mb-2">Matching markets:</p>
                                <div className="flex flex-wrap gap-2">
                                    {msg.data.matches.map((m: MarketMatch) => (
                                        <span
                                            key={m.symbol}
                                            className="px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded text-xs font-medium"
                                        >
                                            {m.symbol} ({(m.score * 100).toFixed(0)}%)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Show intent confidence */}
                        {msg.data?.intent && (
                            <div className="mt-2 text-xs text-white/40">
                                Confidence: {(msg.data.intent.confidence * 100).toFixed(0)}%
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-black/50 rounded-lg p-3 text-[var(--muted)] border border-[var(--card-border)]">
                        <div className="flex items-center gap-2">
                            <span className="animate-spin">⟳</span>
                            Thinking...
                        </div>
                    </div>
                </div>
            )}
            <div ref={endRef} />
        </div>
    );
}
