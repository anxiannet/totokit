
import type { HistoricalResult, TotoCombination } from '../../types';
import { ensureUniqueNumbers, getDeterministicSequence } from '../algorithmUtils';

export function algoLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0 || !lastTenResults[0]?.numbers) {
    // Fallback: if no data, return a deterministic set of 6 numbers
    return getDeterministicSequence(6, 1, 7); // seeds 1 and 7
  }
  // Deterministic: always return the 6 main numbers of the last draw
  return ensureUniqueNumbers([...lastTenResults[0].numbers], 6, 6);
}
