'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, TradeProposal, Position } from '@/types/trade';
import { TradeProposalCard } from '../trade/TradeProposalCard';
import { TradeModificationModal } from '../trade/TradeModificationModal';
import { AcceptTradeModal } from '../trade/AcceptTradeModal';

/**
 * Execution state for a proposal
 * Task 4.4: Track per-proposal execution state
 */
interface ExecutionState {
  isExecuting: boolean;
  error: string | null;
}

// Hook for typewriter effect
function useTypewriter(text: string, speed: number = 10) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete };
}

/**
 * Props for MessageHistory component
 * Task 3.9: Updated to handle modal state and modification submission
 * Task 4.4-4.5: Updated to handle execution states
 */
interface MessageHistoryProps {
  messages: ChatMessage[];
  /** Callback for text-based modification (legacy, kept for backwards compatibility) */
  onModify: (refinementMessage: string) => void;
  /** Callback for modal-based modification submission */
  onModifySubmit?: (
    proposalId: string,
    longPositions: Position[],
    shortPositions: Position[]
  ) => Promise<void>;
  /** Callback for accepting a trade with position size and leverage */
  onAcceptSubmit?: (proposalId: string, positionSizeUsd: number, leverage: number) => Promise<void>;
  /** Set of proposal IDs that have been accepted (trades placed) */
  acceptedProposalIds?: Set<string>;
  /** Map of proposal IDs to execution states (Task 4.4) */
  executionStates?: Map<string, ExecutionState>;
  /** Get execution state for a proposal (Task 4.4) */
  getExecutionState?: (proposalId: string) => ExecutionState;
  /** Callback to retry a failed trade execution (Task 4.5) */
  onRetryTrade?: (proposalId: string, positionSizeUsd: number, leverage: number) => Promise<void>;
  isLoading?: boolean;
}

/**
 * MessageHistory component with trade modification modal support.
 *
 * Task 3.9 Updates:
 * - Determine which proposal is latest (last message with tradeProposal)
 * - Pass isLatest prop to TradeProposalCard
 * - Handle modal open/close state
 * - Wire modal save to sendModification function
 *
 * Task 4.4-4.5 Updates:
 * - Pass execution states to TradeProposalCard
 * - Support retry functionality for failed trades
 */
export function MessageHistory({
  messages,
  onModify: _onModify, // Kept for backwards compatibility, modal flow uses onModifySubmit
  onModifySubmit,
  onAcceptSubmit,
  acceptedProposalIds = new Set(),
  executionStates = new Map(),
  getExecutionState,
  onRetryTrade,
  isLoading,
}: MessageHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalProposal, setModalProposal] = useState<TradeProposal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acceptModalProposal, setAcceptModalProposal] = useState<TradeProposal | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  // Track trade params (size and leverage) for retry functionality
  const [lastTradeParams, setLastTradeParams] = useState<Map<string, { size: number; leverage: number }>>(new Map());

  // Auto-scroll to newest message or thinking indicator
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /**
   * Find the latest proposal ID (last message with tradeProposal)
   */
  const latestProposalId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].tradeProposal) {
        return messages[i].tradeProposal!.id;
      }
    }
    return null;
  }, [messages]);

  /**
   * Handle Modify button click - open modal for latest proposal
   */
  const handleModifyClick = useCallback(
    (proposalId: string) => {
      // Find the proposal in messages
      const message = messages.find((m) => m.tradeProposal?.id === proposalId);
      if (message?.tradeProposal) {
        setModalProposal(message.tradeProposal);
        setIsModalOpen(true);
      }
    },
    [messages]
  );

  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setModalProposal(null);
  }, []);

  /**
   * Handle modal save
   */
  const handleModalSave = useCallback(
    async (longPositions: Position[], shortPositions: Position[]) => {
      if (!modalProposal || !onModifySubmit) return;

      await onModifySubmit(modalProposal.id, longPositions, shortPositions);
      handleModalClose();
    },
    [modalProposal, onModifySubmit, handleModalClose]
  );

  /**
   * Handle Accept button click - open accept modal
   */
  const handleAcceptClick = useCallback((proposal: TradeProposal) => {
    setAcceptModalProposal(proposal);
    setIsAcceptModalOpen(true);
  }, []);

  /**
   * Handle accept modal close
   */
  const handleAcceptModalClose = useCallback(() => {
    setIsAcceptModalOpen(false);
    setAcceptModalProposal(null);
  }, []);

  /**
   * Handle place trade from accept modal
   */
  const handlePlaceTrade = useCallback(
    async (proposalId: string, positionSizeUsd: number, leverage: number) => {
      if (!onAcceptSubmit) return;
      // Store the trade params for potential retry
      setLastTradeParams(prev => {
        const next = new Map(prev);
        next.set(proposalId, { size: positionSizeUsd, leverage });
        return next;
      });
      await onAcceptSubmit(proposalId, positionSizeUsd, leverage);
    },
    [onAcceptSubmit]
  );

  /**
   * Handle retry for a failed trade
   * Task 4.5: Allow retry on error
   */
  const handleRetry = useCallback(
    (proposalId: string) => {
      if (!onRetryTrade) return;
      const tradeParams = lastTradeParams.get(proposalId);
      if (tradeParams) {
        onRetryTrade(proposalId, tradeParams.size, tradeParams.leverage);
      }
    },
    [onRetryTrade, lastTradeParams]
  );

  /**
   * Get execution state for a proposal
   */
  const getProposalExecutionState = useCallback(
    (proposalId: string): ExecutionState => {
      if (getExecutionState) {
        return getExecutionState(proposalId);
      }
      return executionStates.get(proposalId) || { isExecuting: false, error: null };
    },
    [getExecutionState, executionStates]
  );

  if (messages.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onModify={handleModifyClick}
            onModifySubmit={onModifySubmit}
            onAccept={handleAcceptClick}
            isLatest={message.tradeProposal?.id === latestProposalId}
            isAccepted={message.tradeProposal ? acceptedProposalIds.has(message.tradeProposal.id) : false}
            executionState={message.tradeProposal ? getProposalExecutionState(message.tradeProposal.id) : undefined}
            onRetry={message.tradeProposal ? () => handleRetry(message.tradeProposal!.id) : undefined}
          />
        ))}
        {isLoading && <ThinkingIndicator />}
      </div>

      {/* Trade Modification Modal */}
      <TradeModificationModal
        isOpen={isModalOpen}
        proposal={modalProposal}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />

      {/* Accept Trade Modal */}
      <AcceptTradeModal
        isOpen={isAcceptModalOpen}
        proposal={acceptModalProposal}
        onClose={handleAcceptModalClose}
        onPlaceTrade={handlePlaceTrade}
      />
    </>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-transparent text-[var(--foreground)] rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[var(--foreground)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[var(--foreground)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[var(--foreground)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-[var(--muted-foreground)]">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onModify: (proposalId: string) => void;
  onModifySubmit?: (
    proposalId: string,
    longPositions: Position[],
    shortPositions: Position[]
  ) => Promise<void>;
  onAccept: (proposal: TradeProposal) => void;
  isLatest: boolean;
  isAccepted: boolean;
  executionState?: ExecutionState;
  onRetry?: () => void;
}

function MessageBubble({
  message,
  onModify,
  onModifySubmit,
  onAccept,
  isLatest,
  isAccepted,
  executionState,
  onRetry,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { displayedText, isComplete } = useTypewriter(
    isUser ? '' : message.content,
    10
  );

  const handleModifySubmit = useCallback(
    async (longPositions: Position[], shortPositions: Position[]) => {
      if (message.tradeProposal && onModifySubmit) {
        await onModifySubmit(message.tradeProposal.id, longPositions, shortPositions);
      }
    },
    [message.tradeProposal, onModifySubmit]
  );

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
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-inside my-2">{children}</ul>,
                  li: ({ children }) => <li className="my-1">{children}</li>,
                  p: ({ children }) => <p className="my-2">{children}</p>,
                }}
              >
                {displayedText}
              </ReactMarkdown>
              {!isComplete && <span className="animate-pulse">|</span>}
            </div>
          )}
        </div>

        {/* Trade proposal card (only for assistant messages with proposals) */}
        {!isUser && message.tradeProposal && isComplete && (
          <div className="mt-3">
            <TradeProposalCard
              proposal={message.tradeProposal}
              onModify={onModify}
              onModifySubmit={handleModifySubmit}
              onAccept={onAccept}
              isLatest={isLatest}
              isAccepted={isAccepted}
              isExecuting={executionState?.isExecuting}
              executionError={executionState?.error}
              onRetry={onRetry}
            />
          </div>
        )}
      </div>
    </div>
  );
}
