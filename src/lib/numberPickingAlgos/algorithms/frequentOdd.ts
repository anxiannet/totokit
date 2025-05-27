
import type { HistoricalResult, TotoCombination } from '../../types';
import { getNumberFrequencies, ensureUniqueNumbers } from '../algorithmUtils';

export function algoFrequentOdd(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const oddNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num % 2 !== 0 && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(oddNumbers, 1, 10);
}
