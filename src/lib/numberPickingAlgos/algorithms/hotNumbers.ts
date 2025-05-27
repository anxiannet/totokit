
import type { HistoricalResult, TotoCombination } from '../../types';
import { getNumberFrequencies, getSortedNumbersByFrequency, ensureUniqueNumbers } from '../algorithmUtils';

export function algoHotNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'desc');
  const hot = sorted.filter(n => frequencies[n] > 0);
  return ensureUniqueNumbers(hot, 1, 10);
}
