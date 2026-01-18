'use client';

/**
 * Props for LeverageSlider component
 * Task 4.4: Create src/components/trade/LeverageSlider.tsx component
 */
interface LeverageSliderProps {
  /** Current leverage value (1-40) */
  value: number;
  /** Callback when leverage value changes */
  onChange: (value: number) => void;
  /** Minimum leverage value (default: 1) */
  min?: number;
  /** Maximum leverage value (default: 40) */
  max?: number;
}

/**
 * Tick marks to display on the slider
 * Values: 1x, 11x, 21x, 30x, 40x (as shown in mockup)
 */
const TICK_MARKS = [1, 11, 21, 30, 40];

/**
 * LeverageSlider component for selecting trade leverage.
 *
 * Task 4.4: Create src/components/trade/LeverageSlider.tsx component
 * - Props: value, onChange, min (1), max (40)
 * - Horizontal slider with labeled tick marks (1x, 11x, 21x, 30x, 40x)
 * - Current value display on right (e.g., "2x")
 * - Snaps to integer values
 * - Green slider thumb styling as shown in mockup
 */
export function LeverageSlider({
  value,
  onChange,
  min = 1,
  max = 40,
}: LeverageSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    // Snap to nearest integer
    const snappedValue = Math.round(rawValue);
    // Clamp to min/max range
    const clampedValue = Math.max(min, Math.min(max, snappedValue));
    onChange(clampedValue);
  };

  // Calculate the percentage position for the thumb
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full space-y-2">
      {/* Label and current value */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-400">Leverage</label>
        <span className="text-white font-medium">{value}x</span>
      </div>

      {/* Slider container */}
      <div className="relative pt-1 pb-6">
        {/* Track background */}
        <div className="relative h-2 bg-zinc-800 rounded-full">
          {/* Filled track */}
          <div
            className="absolute h-full bg-emerald-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />

          {/* Range input */}
          <input
            type="range"
            min={min}
            max={max}
            step="0.1"
            value={value}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label="Leverage"
          />

          {/* Custom thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full shadow-lg border-2 border-white pointer-events-none"
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>

        {/* Tick marks */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-zinc-500">
          {TICK_MARKS.map((tick) => {
            const tickPercentage = ((tick - min) / (max - min)) * 100;
            return (
              <span
                key={tick}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${tickPercentage}%` }}
              >
                {tick}x
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
