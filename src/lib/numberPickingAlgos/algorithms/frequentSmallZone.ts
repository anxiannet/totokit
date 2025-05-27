
import type { HistoricalResult, TotoCombination } from '../../types';
import { TOTO_NUMBER_RANGE } from '../../types';
import { getNumberFrequencies, ensureUniqueNumbers } from '../algorithmUtils';

export function algoFrequentSmallZone(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const smallZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num >= TOTO_NUMBER_RANGE.min && num <= 24 && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(smallZoneNumbers, 1, 10);
}
