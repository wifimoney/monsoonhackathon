'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, TradeProposal, Position, RecommendedToken } from '@/types/trade';

/**
 * Response from the chat API
 */
interface ChatAPIResponse {
  content: string;
  tradeProposal?: {
    longPositions: Array<{
      symbol: string;
      name: string;
      weight: number;
      dailyVolume: number;
    }>;
    shortPositions: Array<{
      symbol: string;
      name: string;
      weight: number;
      dailyVolume: number;
    }>;
    stopLoss: number;
    takeProfit: number;
    recommendedTokens?: RecommendedToken[];
  };
}

/**
 * Response from the modify API
 */
interface ModifyAPIResponse {
  content: string;
  tradeProposal?: TradeProposal;
  success?: boolean;
  error?: string;
}

/**
 * Custom hook for managing chat state and API communication.
 *
 * Task 3.10 Updates:
 * - Add sendModification function for submitting modified proposals
 * - Handle modification API response
 * - Add new TradeProposalCard message to history
 * - Mark previous proposals as not latest (via isLatest computed in MessageHistory)
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedProposalIds, setAcceptedProposalIds] = useState<Set<string>>(new Set());
  // Ref to track current messages and avoid stale closure issues
  const messagesRef = useRef<ChatMessage[]>([]);

  /**
   * Send a new message to the chat API
   */
  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    // Add user message to history with unique ID
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
    };

    // Update both state and ref
    setMessages((prev) => {
      const updated = [...prev, userMessage];
      messagesRef.current = updated;
      return updated;
    });
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-trade/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use ref to get current messages (avoids stale closure)
          messages: messagesRef.current,
          userInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ChatAPIResponse = await response.json();

      // Create assistant message with unique ID
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
      };

      // If there's a trade proposal, add it to the message
      if (data.tradeProposal) {
        const proposal: TradeProposal = {
          id: crypto.randomUUID(),
          longPositions: data.tradeProposal.longPositions,
          shortPositions: data.tradeProposal.shortPositions,
          stopLoss: data.tradeProposal.stopLoss,
          takeProfit: data.tradeProposal.takeProfit,
          createdAt: new Date(),
          recommendedTokens: data.tradeProposal.recommendedTokens,
        };
        assistantMessage.tradeProposal = proposal;
      }

      setMessages((prev) => {
        const updated = [...prev, assistantMessage];
        messagesRef.current = updated;
        return updated;
      });
    } catch (error) {
      // Add error message from assistant with unique ID
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages((prev) => {
        const updated = [...prev, errorMessage];
        messagesRef.current = updated;
        return updated;
      });
      console.error('Chat API error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  /**
   * Send a modification request to the modify API
   * Task 3.10: Add sendModification function
   *
   * @param originalProposalId - ID of the proposal being modified
   * @param longPositions - Modified LONG positions
   * @param shortPositions - Modified SHORT positions
   */
  const sendModification = useCallback(
    async (
      originalProposalId: string,
      longPositions: Position[],
      shortPositions: Position[]
    ) => {
      if (isLoading) return;

      setIsLoading(true);

      try {
        const response = await fetch('/api/ai-trade/modify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            originalProposalId,
            longPositions,
            shortPositions,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data: ModifyAPIResponse = await response.json();

        // Create assistant message with the modification response
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
        };

        // If there's an updated trade proposal, add it to the message
        if (data.tradeProposal) {
          assistantMessage.tradeProposal = {
            ...data.tradeProposal,
            id: data.tradeProposal.id || crypto.randomUUID(),
            createdAt: data.tradeProposal.createdAt
              ? new Date(data.tradeProposal.createdAt)
              : new Date(),
          };
        }

        // Add a system message indicating modification was submitted
        const modificationNotice: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: `Modified trade proposal: LONG: ${longPositions.map(p => `${p.symbol} (${p.weight}%)`).join(', ') || 'none'}, SHORT: ${shortPositions.map(p => `${p.symbol} (${p.weight}%)`).join(', ') || 'none'}`,
        };

        setMessages((prev) => {
          const updated = [...prev, modificationNotice, assistantMessage];
          messagesRef.current = updated;
          return updated;
        });
      } catch (error) {
        // Add error message from assistant
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            error instanceof Error
              ? `Failed to modify proposal: ${error.message}`
              : 'Sorry, I encountered an error processing your modification. Please try again.',
        };
        setMessages((prev) => {
          const updated = [...prev, errorMessage];
          messagesRef.current = updated;
          return updated;
        });
        console.error('Modify API error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  /**
   * Accept a trade proposal with a position size
   *
   * @param proposalId - ID of the proposal being accepted
   * @param positionSizeUsd - Position size in USD
   */
  const acceptTrade = useCallback(
    async (proposalId: string, positionSizeUsd: number) => {
      if (isLoading) return;

      // Find the proposal in messages
      const proposalMessage = messagesRef.current.find(
        (m) => m.tradeProposal?.id === proposalId
      );
      const proposal = proposalMessage?.tradeProposal;

      if (!proposal) {
        console.error('Proposal not found:', proposalId);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/ai-trade/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proposalId,
            positionSizeUsd,
            longPositions: proposal.longPositions,
            shortPositions: proposal.shortPositions,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();

        // Mark proposal as accepted
        setAcceptedProposalIds((prev) => new Set([...prev, proposalId]));

        // Add success message
        const successMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message || `Trade placed successfully with $${positionSizeUsd} position size.`,
        };

        setMessages((prev) => {
          const updated = [...prev, successMessage];
          messagesRef.current = updated;
          return updated;
        });
      } catch (error) {
        // Add error message
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            error instanceof Error
              ? `Failed to place trade: ${error.message}`
              : 'Sorry, I encountered an error placing your trade. Please try again.',
        };
        setMessages((prev) => {
          const updated = [...prev, errorMessage];
          messagesRef.current = updated;
          return updated;
        });
        console.error('Accept trade API error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setAcceptedProposalIds(new Set());
  }, []);

  return {
    messages,
    isLoading,
    acceptedProposalIds,
    sendMessage,
    sendModification,
    acceptTrade,
    clearMessages,
  };
}
