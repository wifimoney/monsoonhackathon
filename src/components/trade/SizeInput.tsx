'use client';

/**
 * Props for SizeInput component
 * Task 4.3: Create src/components/trade/SizeInput.tsx component
 * Task 7.4: Add isLoading prop for margin loading state
 */
interface SizeInputProps {
  /** Current size value in USD */
  value: number;
  /** Callback when size value changes */
  onChange: (value: number) => void;
  /** Callback when Max button is clicked */
  onMax: () => void;
  /** Available margin balance */
  availableMargin: number;
  /** Current leverage value */
  leverage: number;
  /** Whether margin data is loading */
  isLoading?: boolean;
}

/**
 * Formats a balance value for display.
 * Shows 2 decimal places.
 */
function formatBalance(value: number): string {
  return value.toFixed(2);
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-zinc-500"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * SizeInput component for entering trade size.
 *
 * Task 4.3: Create src/components/trade/SizeInput.tsx component
 * - Props: value, onChange, onMax, availableMargin
 * - USD input field with numeric validation
 * - "Max" button (gray background) fills with availableMargin
 * - "Available Margin" display below showing balance values
 * - Format: main balance and secondary (e.g., "46.97" and "0.00")
 *
 * Task 7.4: Add loading state for margin display
 */
export function SizeInput({
  value,
  onChange,
  onMax,
  availableMargin,
  leverage,
  isLoading = false,
}: SizeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === '') {
      onChange(0);
      return;
    }

    // Parse the value and validate it's a number
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Label */}
      <label className="block text-sm text-zinc-400">Size</label>

      {/* Input container */}
      <div className="relative flex items-center">
        {/* Dollar sign prefix */}
        <span className="absolute left-4 text-zinc-400 font-mono text-lg">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value || ''}
          onChange={handleChange}
          placeholder="0"
          className="w-full pl-8 pr-20 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-lg focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        {/* Max button */}
        <button
          type="button"
          onClick={onMax}
          disabled={isLoading}
          className={`absolute right-3 px-3 py-1.5 text-white text-sm font-medium rounded transition-colors ${
            isLoading
              ? 'bg-zinc-800 cursor-not-allowed'
              : 'bg-zinc-700 hover:bg-zinc-600'
          }`}
        >
          Max
        </button>
      </div>

      {/* Margin displays */}
      <div className="space-y-1">
        {/* Available Margin */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Available Margin</span>
          <div className="flex items-center">
            {isLoading ? (
              <span className="flex items-center gap-1 text-zinc-500">
                <LoadingSpinner />
                <span>Loading...</span>
              </span>
            ) : (
              <span className="text-zinc-300">
                ${formatBalance(availableMargin)}
              </span>
            )}
          </div>
        </div>

        {/* Margin Required */}
        {value > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Margin Required</span>
            <span className="text-zinc-300">
              ${formatBalance(value / leverage)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
