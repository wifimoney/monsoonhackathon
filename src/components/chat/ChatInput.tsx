'use client';

import { useState } from 'react';

interface Props {
    onSend: (message: string) => void;
    disabled?: boolean;
}

const SUGGESTIONS = [
    'Buy $100 of GOLD',
    'I want exposure to oil',
    'Safe hedge against inflation',
    'Sell $50 of SILVER',
];

export function ChatInput({ onSend, disabled }: Props) {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (!input.trim() || disabled) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <div className="border-t border-[var(--card-border)] p-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                    placeholder="Describe what you want to trade..."
                    disabled={disabled}
                    className="flex-1 bg-black text-white rounded-lg px-4 py-3 text-sm
                     border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none
                     placeholder-[var(--muted)] disabled:opacity-50"
                />
                <button
                    onClick={handleSubmit}
                    disabled={disabled || !input.trim()}
                    className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTIONS.map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        disabled={disabled}
                        className="text-xs text-[var(--muted)] hover:text-white 
                       bg-[var(--card)] hover:bg-[var(--card-border)] px-3 py-1.5 rounded-full
                       border border-[var(--card-border)] transition-colors disabled:opacity-50"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}
