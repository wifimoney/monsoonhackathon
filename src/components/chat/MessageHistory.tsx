'use client';

import { useRef, useEffect } from 'react';
import type { ChatMessage } from '@/types/trade';
import { TradeProposalCard } from '../trade/TradeProposalCard';

interface MessageHistoryProps {
  messages: ChatMessage[];
  onModify: (refinementMessage: string) => void;
}

export function MessageHistory({ messages, onModify }: MessageHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message (same pattern as TerminalOutput)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          onModify={onModify}
        />
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onModify: (refinementMessage: string) => void;
}

function MessageBubble({ message, onModify }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      data-role={message.role}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] ${isUser ? 'order-1' : 'order-0'}`}
      >
        {/* Message content */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'bg-transparent text-[var(--foreground)]'
          }`}
          style={{
            fontSize: isUser ? '1rem' : '1.05rem',
          }}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Trade proposal card (only for assistant messages with proposals) */}
        {!isUser && message.tradeProposal && (
          <div className="mt-3">
            <TradeProposalCard
              proposal={message.tradeProposal}
              onModify={onModify}
            />
          </div>
        )}
      </div>
    </div>
  );
}
