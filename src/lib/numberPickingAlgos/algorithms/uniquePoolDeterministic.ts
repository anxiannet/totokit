
import type { HistoricalResult, TotoCombination } from '../../types';
// No need for ensureUniqueNumbers here as the logic inherently produces unique, sorted numbers up to a cap.

export function algoUniquePoolDeterministic(lastTenResults: HistoricalResult[]): TotoCombination {
  const uniquePoolSet: Set<number> = new Set();
  lastTenResults.forEach(result => {
    result.numbers.forEach(num => uniquePoolSet.add(num));
    if (result.additionalNumber) uniquePoolSet.add(result.additionalNumber);
  });
  
  if (uniquePoolSet.size === 0) return [];

  const poolArray = Array.from(uniquePoolSet).sort((a,b) => a - b);
  
  // Deterministic count: e.g., half the pool size, capped between 1 and 15 (or 24 overall max)
  let countToPick = Math.floor(poolArray.length / 2);
  countToPick = Math.max(1, Math.min(countToPick, 15)); // Cap at 15 from this algo's specific logic
  countToPick = Math.min(countToPick, poolArray.length); 
  countToPick = Math.min(countToPick, 24); // Overall cap

  return poolArray.slice(0, countToPick);
}
