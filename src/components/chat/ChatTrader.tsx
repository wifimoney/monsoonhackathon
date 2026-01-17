'use client';

import { useState } from 'react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { TradePreview } from './TradePreview';
import { GuardrailsPanel } from './GuardrailsPanel';
import type { ChatMessage, ActionIntent, MarketMatch, GuardrailsResult, GuardrailsConfig } from '@/agent/types';

export function ChatTrader() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: "I'm your Monsoon trading agent. Describe what you're looking for and I'll find matching markets on Hyperliquid.\n\nTry: \"I want safe exposure to gold, around $200\"",
            timestamp: Date.now(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPreview, setCurrentPreview] = useState<{
        actionIntent: ActionIntent;
        matches: MarketMatch[];
        guardrailsCheck: GuardrailsResult | null;
    } | null>(null);
    const [guardrails, setGuardrails] = useState<GuardrailsConfig>({
        allowedMarkets: ['GOLD', 'OIL', 'SILVER'],
        maxPerTx: 250,
        cooldownSeconds: 60,
        maxSlippageBps: 50,
    });

    const handleSend = async (message: string) => {
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setCurrentPreview(null);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, guardrailsConfig: guardrails }),
            });

            const data = await res.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || "I couldn't process that request.",
                data: {
                    intent: data.intent,
                    matches: data.matches,
                    actionIntent: data.actionIntent,
                    guardrailsCheck: data.guardrailsCheck,
                },
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Set preview if we have an action intent
            if (data.actionIntent) {
                setCurrentPreview({
                    actionIntent: data.actionIntent,
                    matches: data.matches || [],
                    guardrailsCheck: data.guardrailsCheck,
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '❌ Sorry, something went wrong. Please try again.',
                timestamp: Date.now(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!currentPreview?.actionIntent) return;

        setIsLoading(true);

        try {
            const res = await fetch('/api/chat/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionIntent: currentPreview.actionIntent,
                    guardrailsConfig: guardrails,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `✅ Trade executed!\n\nMarket: ${data.receipt.market}\nSide: ${data.receipt.side}\nSize: $${data.receipt.size}\nPrice: $${data.receipt.price}\n\nTx: ${data.txHash?.slice(0, 10)}...${data.txHash?.slice(-8) || ''}`,
                    timestamp: Date.now(),
                }]);
                setCurrentPreview(null);
            } else if (data.denied) {
                const reason = data.policyBreach?.reason || data.issues?.join(', ') || 'Policy violation';
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `🚫 Blocked by guardrails\n\n${reason}\n\nThis is Salt's policy enforcement working as intended.`,
                    data: { policyBreach: data.policyBreach },
                    timestamp: Date.now(),
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `⚠️ Execution failed: ${data.error || 'Unknown error'}`,
                    timestamp: Date.now(),
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: '❌ Execution failed. Please try again.',
                timestamp: Date.now(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-200px)] gap-6">
            {/* Left: Chat */}
            <div className="flex-1 flex flex-col bg-[var(--card)] rounded-lg border border-[var(--card-border)]">
                <div className="border-b border-[var(--card-border)] p-4">
                    <h3 className="font-semibold text-white">Monsoon Agent</h3>
                    <p className="text-xs text-[var(--muted)] mt-1">
                        Chat-driven trading with policy-controlled execution
                    </p>
                </div>
                <ChatMessages messages={messages} isLoading={isLoading} />
                <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>

            {/* Right: Preview + Guardrails */}
            <div className="w-80 flex flex-col gap-4">
                <TradePreview
                    preview={currentPreview}
                    onExecute={handleExecute}
                    isLoading={isLoading}
                />
                <GuardrailsPanel
                    config={guardrails}
                    onChange={setGuardrails}
                />
            </div>
        </div>
    );
}
