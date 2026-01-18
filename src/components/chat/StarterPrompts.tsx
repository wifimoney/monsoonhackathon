'use client';

import { Bot } from 'lucide-react';

interface StarterPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  'I think AI will beat ETH',
  'Bullish on L2s vs L1s',
  'DeFi will outperform memecoins',
];

export function StarterPrompts({ onSelectPrompt }: StarterPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Icon with glow effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-red-600/20 border border-primary/30">
          <Bot className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Heading with gradient text */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent">
          Start a Trade Idea
        </h2>
        <p className="text-muted-foreground text-base max-w-md">
          Describe your market thesis and get AI-powered pair trading suggestions, powered through Pear Protocol
        </p>
      </div>

      {/* Suggestion buttons with hover effects */}
      <div className="flex flex-wrap justify-center gap-3 max-w-[600px]">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="group relative px-5 py-2.5 rounded-xl border border-border/50 bg-card/50 text-sm text-foreground transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(220,38,38,0.15)]"
          >
            <span className="relative z-10">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
