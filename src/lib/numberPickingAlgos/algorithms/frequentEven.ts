
import type { HistoricalResult, TotoCombination } from '../../types';
import { getNumberFrequencies, ensureUniqueNumbers } from '../algorithmUtils';

export function algoFrequentEven(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const evenNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num % 2 === 0 && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(evenNumbers, 1, 10);
}
