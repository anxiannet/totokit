
import type { HistoricalResult, TotoCombination } from '../../types';
import { ensureUniqueNumbers, getDeterministicSequence } from '../algorithmUtils';

export function algoSecondLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length < 2 || !lastTenResults[1]?.numbers) {
    // Fallback: if not enough data, return a different deterministic set of 6 numbers
    return getDeterministicSequence(6, 2, 5); // seeds 2 and 5
  }
  // Deterministic: always return the 6 main numbers of the second to last draw
  return ensureUniqueNumbers([...lastTenResults[1].numbers], 6, 6);
}
