'use client';

import { useCallback, useState, useRef } from 'react';
import { ChatInput, MessageHistory, StarterPrompts } from '@/components/chat';
import { useChat } from '@/hooks/useChat';
import { usePearAuth } from '@/hooks/usePearAuth';
import { AuthModal } from '@/components/pear/AuthModal';
import type { Position } from '@/types/trade';

/**
 * Trade page with AI-driven trading and Pear Protocol integration.
 *
 * Task 4.2: Modified to trigger auth flow on trade acceptance
 * Task 4.4-4.5: Added execution state management and retry functionality
 */
export default function TradePage() {
    const {
        messages,
        isLoading,
        acceptedProposalIds,
        executionStates,
        getExecutionState,
        sendMessage,
        sendModification,
        acceptTrade,
        retryTrade,
    } = useChat();
    const { isAuthenticated, checkAuthStatus } = usePearAuth();

    // State for auth modal and pending trade
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const pendingTradeRef = useRef<{ proposalId: string; positionSizeUsd: number } | null>(null);

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
     * Execute the pending trade after authentication completes
     */
    const executePendingTrade = useCallback(async () => {
        if (pendingTradeRef.current) {
            const { proposalId, positionSizeUsd } = pendingTradeRef.current;
            pendingTradeRef.current = null;
            setIsAuthModalOpen(false);
            await acceptTrade(proposalId, positionSizeUsd);
        }
    }, [acceptTrade]);

    /**
     * Handle accept trade submission from the modal
     * Task 4.2: Trigger authentication automatically when user first accepts a trade
     * - Check if already authenticated before showing modal
     * - After all 4 steps complete, proceed to execute the trade
     */
    const handleAcceptSubmit = useCallback(
        async (proposalId: string, positionSizeUsd: number) => {
            // Check current auth status
            const authed = await checkAuthStatus();

            if (authed) {
                // User is already authenticated, proceed with trade
                await acceptTrade(proposalId, positionSizeUsd);
            } else {
                // User needs to authenticate first
                // Store the pending trade details
                pendingTradeRef.current = { proposalId, positionSizeUsd };
                // Open auth modal
                setIsAuthModalOpen(true);
            }
        },
        [acceptTrade, checkAuthStatus]
    );

    /**
     * Handle retry trade (Task 4.5)
     */
    const handleRetryTrade = useCallback(
        async (proposalId: string, positionSizeUsd: number) => {
            // Check auth status again in case token expired
            const authed = await checkAuthStatus();

            if (authed) {
                await retryTrade(proposalId, positionSizeUsd);
            } else {
                // User needs to re-authenticate
                pendingTradeRef.current = { proposalId, positionSizeUsd };
                setIsAuthModalOpen(true);
            }
        },
        [retryTrade, checkAuthStatus]
    );

    /**
     * Handle auth modal close (without completing)
     */
    const handleAuthModalClose = useCallback(() => {
        setIsAuthModalOpen(false);
        pendingTradeRef.current = null;
    }, []);

    /**
     * Handle auth completion - execute the pending trade
     */
    const handleAuthComplete = useCallback(() => {
        executePendingTrade();
    }, [executePendingTrade]);

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
                        executionStates={executionStates}
                        getExecutionState={getExecutionState}
                        onRetryTrade={handleRetryTrade}
                        isLoading={isLoading}
                    />
                )}
            </div>

            {/* Fixed bottom input */}
            <ChatInput onSend={handleSend} isLoading={isLoading} />

            {/* Authentication Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={handleAuthModalClose}
                onAuthComplete={handleAuthComplete}
            />
        </div>
    );
}
