
import type { HistoricalResult, TotoCombination } from '../../types';
import { getNumberFrequencies, getSortedNumbersByFrequency, ensureUniqueNumbers } from '../algorithmUtils';

export function algoColdNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'asc');
  
  const appearedNumbers = sorted.filter(n => frequencies[n] > 0);
  
  if (appearedNumbers.length > 0) {
      return ensureUniqueNumbers(appearedNumbers, 1, 10);
  }
  return [];
}
