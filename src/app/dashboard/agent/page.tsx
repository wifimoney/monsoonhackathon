'use client';

import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { MessageHistory, StarterPrompts } from '@/components/chat';
import { useChat } from '@/hooks/useChat';
import { usePearAuth } from '@/hooks/usePearAuth';
import { AuthModal } from '@/components/pear/AuthModal';
import type { Position } from '@/types/trade';

/**
 * Dashboard Agent page with AI-driven trading and Pear Protocol integration.
 *
 * Task Group 1: Merged trade page logic into dashboard agent page
 * - Imports useChat and usePearAuth hooks
 * - Includes all trade handlers
 * - Conditional rendering of StarterPrompts vs MessageHistory
 * - AuthModal integration for trade acceptance flow
 */
export default function AgentPage() {
  // Chat hook for messages and trade functionality
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

  // Pear authentication hook
  const { isAuthenticated, checkAuthStatus } = usePearAuth();

  // State for auth modal and pending trade
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingTradeRef = useRef<{ proposalId: string; positionSizeUsd: number } | null>(null);

  // Input state for the chat input
  const [input, setInput] = useState('');

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(
    (message?: string) => {
      const messageToSend = message || input;
      if (!messageToSend.trim()) return;
      sendMessage(messageToSend);
      if (!message) {
        setInput('');
      }
    },
    [input, sendMessage]
  );

  /**
   * Handle modification from chat (text-based, legacy)
   */
  const handleModify = useCallback(
    (refinementMessage: string) => {
      sendMessage(refinementMessage);
    },
    [sendMessage]
  );

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
   * Trigger authentication automatically when user first accepts a trade
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
   * Handle retry trade
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

  /**
   * Handle selecting a starter prompt
   */
  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Starter prompts or message history */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
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

      {/* Input Area */}
      <div className="border-t border-border/50 pt-4">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your trade idea..."
            className="flex-1 bg-card border-border/50 focus-visible:ring-primary text-sm"
          />
          <Button
            onClick={() => handleSend()}
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        onAuthComplete={handleAuthComplete}
      />
    </div>
  );
}
