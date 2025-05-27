
import type { HistoricalResult, TotoCombination } from './types';
import { TOTO_NUMBER_RANGE } from './types'; // Removed TOTO_COMBINATION_LENGTH from here

// --- Helper Functions ---

function getNumberFrequencies(results: HistoricalResult[], includeAdditional = false): Record<number, number> {
  const frequencies: Record<number, number> = {};
  for (let i = TOTO_NUMBER_RANGE.min; i <= TOTO_NUMBER_RANGE.max; i++) {
    frequencies[i] = 0;
  }

  results.forEach(result => {
    result.numbers.forEach(num => {
      frequencies[num]++;
    });
    if (includeAdditional && result.additionalNumber) { // check if additionalNumber exists
      frequencies[result.additionalNumber]++;
    }
  });
  return frequencies;
}

function getSortedNumbersByFrequency(frequencies: Record<number, number>, order: 'asc' | 'desc'): number[] {
  return Object.entries(frequencies)
    .sort(([, freqA], [, freqB]) => (order === 'desc' ? freqB - freqA : freqA - freqB))
    .map(([numStr]) => parseInt(numStr, 10));
}

function getRandomNumbers(count: number, existingNumbers: number[] = [], minRange = TOTO_NUMBER_RANGE.min, maxRange = TOTO_NUMBER_RANGE.max): TotoCombination {
  const picked: Set<number> = new Set(existingNumbers);
  const randomPicks: number[] = [];
  
  if (count <= 0) return [];

  let attempts = 0; // Safety break for tight ranges
  const maxAttempts = (maxRange - minRange + 1) * 2;


  while (randomPicks.length < count && attempts < maxAttempts) {
    const num = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
    if (!picked.has(num)) {
      randomPicks.push(num);
      picked.add(num);
    }
    attempts++;
  }
  return randomPicks.sort((a, b) => a - b);
}

function ensureUniqueNumbers(numbers: number[], minCount: number = 1, maxCount: number = 24): TotoCombination {
  const uniqueNumbers = Array.from(new Set(numbers));
  if (uniqueNumbers.length >= maxCount) {
    return uniqueNumbers.slice(0, maxCount).sort((a,b) => a - b);
  }
  if (uniqueNumbers.length >= minCount && uniqueNumbers.length < maxCount) {
    return uniqueNumbers.sort((a,b) => a - b);
  }
  
  const needed = Math.max(minCount - uniqueNumbers.length, 0); // Ensure we at least meet minCount
  const randomFill = getRandomNumbers(needed, uniqueNumbers);
  
  let combined = [...uniqueNumbers, ...randomFill];
  combined = Array.from(new Set(combined)); // Ensure uniqueness again after fill

  if (combined.length > maxCount) {
    return combined.slice(0, maxCount).sort((a,b) => a - b);
  }
  // If still less than minCount (e.g. very small pool from filters), pad more
  if (combined.length < minCount) {
      const stillNeeded = minCount - combined.length;
      const moreRandomFill = getRandomNumbers(stillNeeded, combined);
      combined = [...combined, ...moreRandomFill];
      combined = Array.from(new Set(combined));
  }

  return combined.slice(0, Math.min(combined.length, maxCount)).sort((a,b) => a - b);
}

// --- Algorithm Implementations ---

export function algoHotNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(Math.floor(Math.random() * 10) + 1); // 1 to 10 random numbers
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'desc');
  // Return top N, where N is min(length of sorted hot numbers, 10), but at least 1.
  const count = Math.min(sorted.length, 10);
  return ensureUniqueNumbers(sorted.slice(0, count), 1, 10);
}

export function algoColdNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(Math.floor(Math.random() * 10) + 1);
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'asc');
  const count = Math.min(sorted.length, 10);
  return ensureUniqueNumbers(sorted.slice(0, count), 1, 10);
}

export function algoLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(6); // Default to 6 if no data
  return ensureUniqueNumbers([...lastTenResults[0].numbers], 6, 6); // Keep this at 6
}

export function algoSecondLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length < 2) return getRandomNumbers(6); // Default to 6
  return ensureUniqueNumbers([...lastTenResults[1].numbers], 6, 6); // Keep this at 6
}

export function algoFrequentEven(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(Math.floor(Math.random() * 10) + 1).filter(n => n%2===0);
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const evenNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 === 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(evenNumbers.length, 10);
  return ensureUniqueNumbers(evenNumbers.slice(0, count), 1, 10);
}

export function algoFrequentOdd(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(Math.floor(Math.random() * 10) + 1).filter(n => n%2!==0);
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const oddNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 !== 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(oddNumbers.length, 10);
  return ensureUniqueNumbers(oddNumbers.slice(0, count), 1, 10);
}

export function algoFrequentSmallZone(lastTenResults: HistoricalResult[]): TotoCombination {
   if (lastTenResults.length === 0) return getRandomNumbers(Math.floor(Math.random() * 10) + 1, [], 1, 24);
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const smallZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) >= 1 && parseInt(numStr, 10) <= 24)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(smallZoneNumbers.length, 10);
  return ensureUniqueNumbers(smallZoneNumbers.slice(0, count), 1, 10);
}

export function algoFrequentLargeZone(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(Math.floor(Math.random() * 10) + 1, [], 25, 49);
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const largeZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) >= 25 && parseInt(numStr, 10) <= TOTO_NUMBER_RANGE.max)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(largeZoneNumbers.length, 10);
  return ensureUniqueNumbers(largeZoneNumbers.slice(0, count), 1, 10);
}

export function algoUniquePoolRandom(lastTenResults: HistoricalResult[]): TotoCombination {
  const uniquePoolSet: Set<number> = new Set();
  lastTenResults.forEach(result => {
    result.numbers.forEach(num => uniquePoolSet.add(num));
    if (result.additionalNumber) uniquePoolSet.add(result.additionalNumber);
  });
  const poolArray = Array.from(uniquePoolSet);
  
  if (poolArray.length === 0) {
    return getRandomNumbers(Math.floor(Math.random() * 19) + 6, [], 1, 24); // 6 to 24 random numbers
  }

  // Pick a random count between min(poolArray.length, 6) and min(poolArray.length, 20), clamped by 1 and 24.
  const minPick = Math.max(1, Math.min(poolArray.length, 6));
  const maxPick = Math.min(poolArray.length, 24, 20); // Cap at 20 for variety, but ensure no more than 24 or pool size
  
  let countToPick = Math.floor(Math.random() * (maxPick - minPick + 1)) + minPick;
  countToPick = Math.max(1, Math.min(countToPick, 24)); // Final clamp

  // Shuffle and pick
  for (let i = poolArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolArray[i], poolArray[j]] = [poolArray[j], poolArray[i]];
  }
  return poolArray.slice(0, countToPick).sort((a,b) => a - b);
}

export function algoLuckyDip(): TotoCombination {
  const countToPick = Math.floor(Math.random() * 19) + 6; // Generate between 6 and 24 numbers
  return getRandomNumbers(Math.min(countToPick, 24));
}

export interface NumberPickingTool {
  id: string;
  name: string;
  description: string;
  algorithmFn: (lastTenResults: HistoricalResult[]) => TotoCombination;
}
