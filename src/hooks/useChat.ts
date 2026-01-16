'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, TradeProposal } from '@/types/trade';

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
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    // Add user message to history
    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-trade/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ChatAPIResponse = await response.json();

      // Create assistant message
      const assistantMessage: ChatMessage = {
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
        };
        assistantMessage.tradeProposal = proposal;
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Add error message from assistant
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Chat API error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
