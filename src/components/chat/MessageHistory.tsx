'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
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
 *
 * Task Group 2 Updates:
 * - Added Bot and User avatar icons from lucide-react
 * - Updated message layout with flex gap-3 and justify-start/justify-end
 * - Updated bubble styling with rounded-2xl, bg-card/bg-primary variants
 * - Updated scrollable area with flex-1 overflow-y-auto space-y-4 pb-4
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
      {/* Task 2.4: Updated scrollable message area styling */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
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
    <div className="flex gap-3 justify-start">
      {/* Bot avatar for thinking indicator */}
      <div
        data-testid="bot-avatar"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-xl rounded-2xl px-4 py-3 bg-card border border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[var(--foreground)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[var(--foreground)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[var(--foreground)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm leading-relaxed text-[var(--muted-foreground)]">Thinking...</span>
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
    // Task 2.2: Updated flex layout for messages
    <div
      data-role={message.role}
      data-testid={`message-container-${isUser ? 'user' : 'bot'}`}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Task 2.2: Bot avatar - only show for assistant messages */}
      {!isUser && (
        <div
          data-testid="bot-avatar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className="max-w-xl">
        {/* Task 2.3: Updated message bubble styling */}
        <div
          data-testid={`${isUser ? 'user' : 'bot'}-message-bubble`}
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border/50'
          }`}
        >
          {isUser ? (
            // Task 2.3: Updated text styling
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
          ) : (
            // Task 2.3: Updated text styling for bot messages
            <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
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

      {/* Task 2.2: User avatar - only show for user messages */}
      {isUser && (
        <div
          data-testid="user-avatar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
