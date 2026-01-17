'use client';

import { useCallback } from 'react';
import { ChatInput, MessageHistory, StarterPrompts } from '@/components/chat';
import { useChat } from '@/hooks/useChat';
import type { Position } from '@/types/trade';

export default function TradePage() {
    const { messages, isLoading, acceptedProposalIds, sendMessage, sendModification, acceptTrade } = useChat();

    const handleSend = (message: string) => {
        sendMessage(message);
    };

    const handleModify = (refinementMessage: string) => {
        sendMessage(refinementMessage);
    };

    /**
     * Handle modification submission from the modal
     * Wires the MessageHistory to the useChat sendModification function
     */
    const handleModifySubmit = useCallback(
        async (
            proposalId: string,
            longPositions: Position[],
            shortPositions: Position[]
        ) => {
            await sendModification(proposalId, longPositions, shortPositions);
        },
        [sendModification]
    );

    /**
     * Handle accept trade submission from the modal
     * Wires the MessageHistory to the useChat acceptTrade function
     */
    const handleAcceptSubmit = useCallback(
        async (proposalId: string, positionSizeUsd: number) => {
            await acceptTrade(proposalId, positionSizeUsd);
        },
        [acceptTrade]
    );

    const handleSelectPrompt = (prompt: string) => {
        sendMessage(prompt);
    };

    return (
        <div className="ai-trade-page">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Trade</h2>
                <p className="text-[var(--muted)] mt-1">
                    Chat-driven trading with AI intent classification and policy enforcement
                </p>
            </div>

            <div className="ai-trade-container">
                {/* Starter prompts or message history */}
                {messages.length === 0 ? (
                    <div className="ai-trade-welcome">
                        <StarterPrompts onSelectPrompt={handleSelectPrompt} />
                    </div>
                ) : (
                    <MessageHistory
                        messages={messages}
                        onModify={handleModify}
                        onModifySubmit={handleModifySubmit}
                        onAcceptSubmit={handleAcceptSubmit}
                        acceptedProposalIds={acceptedProposalIds}
                        isLoading={isLoading}
                    />
                )}
            </div>

            {/* Fixed bottom input */}
            <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
    );
}
