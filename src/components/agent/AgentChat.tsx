'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'agent';
    content: string;
    intent?: any;
    result?: any;
    timestamp: number;
}

export function AgentChat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'agent',
            content: "I'm your Monsoon trading agent. I can execute trades on Hyperliquid within your guardrails.\n\nTry:\n• \"buy $100 of GOLD\"\n• \"sell $50 OIL\"",
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async () => {
        if (!input.trim() || isProcessing) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
        }]);
        setIsProcessing(true);

        try {
            const res = await fetch('/api/agent/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: userMessage }),
            });

            const data = await res.json();

            if (data.intent && data.result) {
                const { intent, result } = data;

                if (result.success) {
                    // Success message
                    setMessages(prev => [...prev, {
                        role: 'agent',
                        content: `✅ Executed: ${formatIntent(intent)}\n\nTransaction: ${result.txHash?.slice(0, 10)}...${result.txHash?.slice(-8)}`,
                        intent,
                        result,
                        timestamp: Date.now(),
                    }]);
                } else if (result.policyBreach) {
                    // Policy denial
                    setMessages(prev => [...prev, {
                        role: 'agent',
                        content: `🚫 Blocked by guardrails\n\n${result.policyBreach.reason}\n\nYour policies prevented this action. This is working as intended!`,
                        intent,
                        result,
                        timestamp: Date.now(),
                    }]);
                } else {
                    // Other error
                    setMessages(prev => [...prev, {
                        role: 'agent',
                        content: `⚠️ Failed: ${result.error || 'Unknown error'}`,
                        intent,
                        result,
                        timestamp: Date.now(),
                    }]);
                }
            } else if (data.error === 'parse_failed') {
                // Parse failure
                setMessages(prev => [...prev, {
                    role: 'agent',
                    content: `I didn't understand that. Try:\n${data.suggestions?.map((s: string) => `• "${s}"`).join('\n')}`,
                    timestamp: Date.now(),
                }]);
            } else {
                // Generic error
                setMessages(prev => [...prev, {
                    role: 'agent',
                    content: `❌ Error: ${data.message || 'Something went wrong'}`,
                    timestamp: Date.now(),
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'agent',
                content: '❌ Connection error. Please try again.',
                timestamp: Date.now(),
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatIntent = (intent: any): string => {
        if (intent.type === 'SPOT_BUY') {
            return `BUY $${intent.amount} ${intent.market}`;
        } else if (intent.type === 'SPOT_SELL') {
            return `SELL $${intent.amount} ${intent.market}`;
        } else if (intent.type === 'TRANSFER') {
            return `TRANSFER ${intent.amount} ${intent.token}`;
        }
        return JSON.stringify(intent);
    };

    return (
        <div className="flex flex-col h-[600px] bg-[var(--card)] rounded-lg border border-[var(--card-border)]">
            {/* Header */}
            <div className="border-b border-[var(--card-border)] p-4">
                <h3 className="font-semibold text-white">Monsoon Agent</h3>
                <p className="text-xs text-[var(--muted)] mt-1">
                    Policy-controlled trading on HyperEVM
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-black/50 text-white border border-[var(--card-border)]'
                            }`}>
                            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                                {msg.content}
                            </pre>
                            {msg.result && (
                                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/60">
                                    Stage: {msg.result.stage}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-black/50 rounded-lg p-3 text-[var(--muted)] border border-[var(--card-border)]">
                            <div className="flex items-center gap-2">
                                <span className="animate-spin">⟳</span>
                                Processing...
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[var(--card-border)] p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                        placeholder="Tell the agent what to do..."
                        disabled={isProcessing}
                        className="flex-1 bg-black text-white rounded-lg px-4 py-3 text-sm border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !input.trim()}
                        className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? '...' : 'Send'}
                    </button>
                </div>
                <p className="text-xs text-[var(--muted)] mt-2">
                    Example: "buy $100 of GOLD" or "sell $50 OIL"
                </p>
            </div>
        </div>
    );
}
