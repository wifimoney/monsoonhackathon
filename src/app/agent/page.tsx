'use client';

import { useState, useEffect } from 'react';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { TradePreview } from '@/components/chat/TradePreview';
import { PolicySimulator } from '@/components/salt/PolicySimulator';
import { AutonomyControl } from '@/components/salt/AutonomyControl';
import { PositionSizer } from '@/components/salt/PositionSizer';
import { TransactionLifecycle, TransactionState } from '@/components/salt/TransactionLifecycle';
import { BreachAnalytics } from '@/components/salt/BreachAnalytics';
import { EmergencyStop } from '@/components/salt/EmergencyStop';
import { StrategyConsole } from '@/components/salt/StrategyConsole';
import type { ChatMessage, ActionIntent, MarketMatch, GuardrailsResult, GuardrailsConfig } from '@/agent/types';
import type { AutonomyConfig } from '@/agent/autonomy';

interface PositionRecommendation {
    recommendedSize: number;
    maxAllowedSize: number;
    reasoning: string[];
    constraints: { name: string; limit: number; remaining: number; constrains: boolean }[];
    riskAdjustment?: { applied: boolean; factor: number; reason: string };
}

export default function AgentPage() {
    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: "I'm your Monsoon trading agent with advanced Salt integration.\n\nTry: \"I want safe exposure to gold, around $200\"",
            timestamp: Date.now(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    // Trade state
    const [currentPreview, setCurrentPreview] = useState<{
        actionIntent: ActionIntent;
        matches: MarketMatch[];
        guardrailsCheck: GuardrailsResult | null;
    } | null>(null);

    // Config state
    const [guardrails, setGuardrails] = useState<GuardrailsConfig>({
        allowedMarkets: ['GOLD', 'OIL', 'SILVER'],
        maxPerTx: 250,
        cooldownSeconds: 60,
        maxSlippageBps: 100,
    });

    const [autonomy, setAutonomy] = useState<AutonomyConfig>({
        level: 1,
        autoApproveMaxSize: 50,
        autoApproveMarkets: ['GOLD', 'OIL'],
    });

    // Position sizing
    const [positionRecommendation, setPositionRecommendation] = useState<PositionRecommendation | null>(null);
    const [currentSize, setCurrentSize] = useState(100);

    // Transaction lifecycle
    const [transaction, setTransaction] = useState<TransactionState | null>(null);

    // Emergency stop
    const [isStopped, setIsStopped] = useState(false);

    // Update position recommendation when preview changes
    useEffect(() => {
        if (currentPreview?.actionIntent) {
            // Simulate position sizing based on current state
            const maxAllowed = Math.min(guardrails.maxPerTx, 500); // Daily budget sim
            const recommended = Math.min(maxAllowed * 0.5, currentPreview.actionIntent.notionalUsd);

            setPositionRecommendation({
                recommendedSize: Math.round(recommended / 5) * 5,
                maxAllowedSize: maxAllowed,
                reasoning: ['50% of available budget', 'Risk-adjusted for market'],
                constraints: [
                    { name: 'Per-Transaction', limit: guardrails.maxPerTx, remaining: guardrails.maxPerTx, constrains: true },
                    { name: 'Daily Budget', limit: 500, remaining: 450, constrains: false },
                ],
            });
            setCurrentSize(currentPreview.actionIntent.notionalUsd);
        }
    }, [currentPreview, guardrails.maxPerTx]);

    const handleSend = async (message: string) => {
        if (isStopped) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: '⏹ Agent is stopped. Re-enable to continue.',
                timestamp: Date.now(),
            }]);
            return;
        }

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
                content: '❌ Something went wrong. Please try again.',
                timestamp: Date.now(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!currentPreview?.actionIntent || isStopped) return;

        // Update size from position sizer
        const intent = { ...currentPreview.actionIntent, notionalUsd: currentSize };

        setIsLoading(true);
        setTransaction({ stage: 'proposed', startedAt: Date.now() });

        // Simulate lifecycle stages
        await new Promise(r => setTimeout(r, 500));
        setTransaction(prev => prev ? { ...prev, stage: 'policy_check' } : null);

        await new Promise(r => setTimeout(r, 800));

        try {
            const res = await fetch('/api/chat/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionIntent: intent,
                    guardrailsConfig: guardrails,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setTransaction(prev => prev ? { ...prev, stage: 'signing' } : null);
                await new Promise(r => setTimeout(r, 600));
                setTransaction(prev => prev ? { ...prev, stage: 'broadcasting' } : null);
                await new Promise(r => setTimeout(r, 800));
                setTransaction(prev => prev ? { ...prev, stage: 'confirming' } : null);
                await new Promise(r => setTimeout(r, 500));
                setTransaction(prev => prev ? {
                    ...prev,
                    stage: 'confirmed',
                    txHash: data.txHash || '0x' + Math.random().toString(16).slice(2),
                    completedAt: Date.now(),
                } : null);

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `✅ Trade executed!\n\nMarket: ${intent.market}\nSide: ${intent.side}\nSize: $${intent.notionalUsd}`,
                    timestamp: Date.now(),
                }]);
                setCurrentPreview(null);
            } else {
                setTransaction(prev => prev ? {
                    ...prev,
                    stage: 'denied',
                    policyDenial: {
                        reason: data.policyBreach?.reason || data.issues?.join(', ') || 'Policy violation',
                        policies: data.policyBreach?.rejectedPolicies?.map((p: any) => p.name) || [],
                    }
                } : null);

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `🚫 Blocked by guardrails\n\n${data.policyBreach?.reason || data.issues?.join(', ') || 'Policy violation'}`,
                    timestamp: Date.now(),
                }]);
            }
        } catch (error) {
            setTransaction(prev => prev ? { ...prev, stage: 'failed', error: 'Network error' } : null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleIntentChange = (intent: ActionIntent) => {
        if (currentPreview) {
            setCurrentPreview({ ...currentPreview, actionIntent: intent });
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-[var(--card-border)] p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Monsoon Agent</h1>
                        <p className="text-[var(--muted)] text-sm">
                            Policy-controlled capital management with advanced Salt integration
                        </p>
                    </div>
                    <EmergencyStop onStop={() => setIsStopped(true)} />
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4">
                <div className="grid grid-cols-12 gap-4">

                    {/* Left Column: Autonomy + Analytics */}
                    <div className="col-span-3 space-y-4">
                        <AutonomyControl config={autonomy} onChange={setAutonomy} />
                        <BreachAnalytics />
                    </div>

                    {/* Center: Chat */}
                    <div className="col-span-5 flex flex-col bg-[var(--card)] rounded-lg border border-[var(--card-border)]">
                        <div className="border-b border-[var(--card-border)] p-4">
                            <h3 className="font-semibold text-white">Agent Chat</h3>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Chat-driven trading with LLM intent classification
                            </p>
                        </div>
                        <div className="flex-1 flex flex-col h-[500px]">
                            <ChatMessages messages={messages} isLoading={isLoading} />
                            <ChatInput onSend={handleSend} disabled={isLoading || isStopped} />
                        </div>
                    </div>

                    {/* Right Column: Preview + Simulator + Sizing + Lifecycle */}
                    <div className="col-span-4 space-y-4">
                        <TradePreview
                            preview={currentPreview}
                            onExecute={handleExecute}
                            isLoading={isLoading}
                        />
                        <PolicySimulator
                            actionIntent={currentPreview?.actionIntent || null}
                            guardrailsConfig={guardrails}
                            onIntentChange={handleIntentChange}
                        />
                        <PositionSizer
                            recommendation={positionRecommendation}
                            currentSize={currentSize}
                            onSizeChange={setCurrentSize}
                        />
                        <TransactionLifecycle transaction={transaction} />
                        <StrategyConsole />
                    </div>

                </div>
            </div>
        </div>
    );
}
