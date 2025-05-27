
import type { HistoricalResult, TotoCombination } from '../../types';
import { TOTO_NUMBER_RANGE } from '../../types';
import { getNumberFrequencies, ensureUniqueNumbers } from '../algorithmUtils';

export function algoFrequentLargeZone(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const largeZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num >= 25 && num <= TOTO_NUMBER_RANGE.max && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(largeZoneNumbers, 1, 10);
}
