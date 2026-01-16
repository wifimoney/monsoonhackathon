import type { Position } from '@/types/trade';

/**
 * Validates that the weights of positions sum to 100%.
 * Empty arrays are considered valid (no positions to validate).
 *
 * @param positions - Array of positions to validate
 * @returns true if weights sum to 100 (or array is empty), false otherwise
 */
export function validateWeightsSum(positions: Position[]): boolean {
  // Empty positions array is valid (no positions means no weight distribution needed)
  if (positions.length === 0) {
    return true;
  }

  const totalWeight = positions.reduce((sum, position) => sum + position.weight, 0);

  // Allow for small floating point differences (within 0.01%)
  return Math.abs(totalWeight - 100) < 0.01;
}

/**
 * Validates that a single position's weight is within the valid range (0-100).
 *
 * @param weight - The weight percentage to validate
 * @returns true if weight is between 0 and 100 inclusive
 */
export function isValidWeight(weight: number): boolean {
  return weight >= 0 && weight <= 100;
}
