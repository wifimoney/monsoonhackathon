'use client';

interface StarterPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  hasMessages?: boolean;
}

const STARTER_PROMPTS = [
  'I think AI will beat ETH',
  'Bullish on L2s vs L1s',
  'DeFi will outperform memecoins',
];

export function StarterPrompts({ onSelectPrompt, hasMessages = false }: StarterPromptsProps) {
  if (hasMessages) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Start a Trade Idea</h2>
        <p className="text-[var(--muted)]">
          Describe your market thesis and get AI-powered trade suggestions
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 max-w-[600px]">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="px-4 py-2 rounded-lg border border-border/50 bg-card text-sm text-foreground hover:bg-primary/10 hover:border-primary/50 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
