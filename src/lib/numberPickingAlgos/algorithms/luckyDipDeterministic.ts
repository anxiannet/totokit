
import type { HistoricalResult, TotoCombination } from '../../types';
import { TOTO_NUMBER_RANGE } from '../../types';
import { getDeterministicSequence } from '../algorithmUtils';

export function algoLuckyDipDeterministic(lastTenResults: HistoricalResult[]): TotoCombination {
  const countToPick = lastTenResults.length > 0
                      ? Math.max(1, Math.min(6 + (lastTenResults.length % 15), 24))
                      : getDeterministicSequence(10, new Date().getDate(), (new Date().getMonth()+1)).length;

  if (lastTenResults.length === 0) {
      const date = new Date();
      return getDeterministicSequence(countToPick, date.getDate(), (date.getMonth()+1)* (date.getFullYear()%100) );
  }
  
  const seed1 = lastTenResults.reduce((sum, r) => sum + r.drawNumber, 0) % TOTO_NUMBER_RANGE.max || 1;
  const seed2 = lastTenResults.reduce((sum, r) => sum + r.additionalNumber, 0) % 13 || 1;
  
  return getDeterministicSequence(countToPick, seed1, seed2);
}
