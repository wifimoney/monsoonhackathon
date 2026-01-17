'use client';

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
            className="btn btn-secondary"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
