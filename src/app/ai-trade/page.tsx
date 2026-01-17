'use client';

import { ChatInput, MessageHistory, StarterPrompts } from '@/components/chat';
import { useChat } from '@/hooks/useChat';

export default function AITradePage() {
  const { messages, isLoading, sendMessage } = useChat();

  const handleSend = (message: string) => {
    sendMessage(message);
  };

  const handleModify = (refinementMessage: string) => {
    sendMessage(refinementMessage);
  };

  const handleSelectPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="ai-trade-page">
      <div className="ai-trade-container">
        {/* Starter prompts or message history */}
        {messages.length === 0 ? (
          <div className="ai-trade-welcome">
            <StarterPrompts onSelectPrompt={handleSelectPrompt} />
          </div>
        ) : (
          <MessageHistory messages={messages} onModify={handleModify} />
        )}
      </div>

      {/* Fixed bottom input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
