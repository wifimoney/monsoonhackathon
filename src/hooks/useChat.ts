'use client';

import { useState, useCallback, useRef } from 'react';
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
  // Ref to track current messages and avoid stale closure issues
  const messagesRef = useRef<ChatMessage[]>([]);

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

  const clearMessages = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
