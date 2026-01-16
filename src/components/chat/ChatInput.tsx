'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export function ChatInput({ onSend, isLoading, initialValue = '' }: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter allows newline (default behavior)
    // Enter without Shift sends the message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && !isLoading) {
      onSend(trimmedValue);
      setValue('');
      // Refocus the textarea after sending
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--background)] border-t border-[var(--card-border)]">
      <div className="max-w-[800px] mx-auto flex gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your trading thesis..."
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            minHeight: '48px',
            maxHeight: '120px',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !value.trim()}
          className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
