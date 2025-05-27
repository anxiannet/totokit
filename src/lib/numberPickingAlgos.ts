
import type { HistoricalResult, TotoCombination } from './types';
import { TOTO_NUMBER_RANGE } from './types';

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
    if (includeAdditional && result.additionalNumber) {
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

// Generates a deterministic sequence of unique numbers for LuckyDip based on input seed
function getDeterministicSequence(count: number, seed1: number, seed2: number): TotoCombination {
  const picked: Set<number> = new Set();
  let currentNum = seed1;
  const step = seed2 || 7; // Ensure step is not 0

  while (picked.size < count) {
    currentNum = (currentNum + step -1) % TOTO_NUMBER_RANGE.max + 1; // Cycle through 1-49
    if (!picked.has(currentNum)) {
      picked.add(currentNum);
    }
    // Safety break if somehow stuck (e.g., count > 49)
    if (picked.size >= TOTO_NUMBER_RANGE.max && picked.size < count) break; 
    if (picked.size > TOTO_NUMBER_RANGE.max * 2 && picked.size < count) break; // Sanity check
  }
  return Array.from(picked).slice(0, count).sort((a, b) => a - b);
}


function ensureUniqueNumbers(numbers: number[], minCount: number = 1, maxCount: number = 24): TotoCombination {
  let uniqueNumbers = Array.from(new Set(numbers.filter(n => n >= TOTO_NUMBER_RANGE.min && n <= TOTO_NUMBER_RANGE.max)));
  
  // Sort before any slicing or returning
  uniqueNumbers.sort((a, b) => a - b);

  // If we have fewer than minCount, return what we have (no random padding)
  // unless minCount is 0, which implies no minimum.
  // The primary role is now to ensure uniqueness and cap at maxCount.
  if (uniqueNumbers.length < minCount && minCount > 0) {
     // For algorithms that strictly need a certain count (like lastDrawRepeat for 6 numbers)
     // they should handle this. For others, returning fewer is fine.
     // For this general helper, we'll return what we have if it's below minCount.
  }

  if (uniqueNumbers.length > maxCount) {
    return uniqueNumbers.slice(0, maxCount);
  }
  
  return uniqueNumbers;
}

// --- Algorithm Implementations ---

export function algoHotNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return []; 
  const frequencies = getNumberFrequencies(lastTenResults, false); // Only main numbers
  const sorted = getSortedNumbersByFrequency(frequencies, 'desc');
  // Return top N, where N is min(length of sorted hot numbers, 10), but at least 1 if available.
  const count = Math.min(sorted.filter(n => frequencies[n] > 0).length, 10);
  return ensureUniqueNumbers(sorted.slice(0, count), 1, 10);
}

export function algoColdNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'asc');
  // Filter for numbers that actually appeared if we want to avoid 0-frequency numbers being "coldest"
  // Or, if all numbers are 0-frequency, this will return empty.
  const appearedNumbers = sorted.filter(n => frequencies[n] > 0);
  const coldFromAppeared = appearedNumbers.slice(0,10);

  if (coldFromAppeared.length > 0) {
      return ensureUniqueNumbers(coldFromAppeared, 1, 10);
  }
  // If no numbers appeared or all appeared with same low freq, pick from all numbers with 0 frequency
  const zeroFrequencyNumbers = sorted.filter(n => frequencies[n] === 0);
  return ensureUniqueNumbers(zeroFrequencyNumbers.slice(0,10), 1, 10);
}

export function algoLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0 || !lastTenResults[0]?.numbers) return [];
  return ensureUniqueNumbers([...lastTenResults[0].numbers], 6, 6); 
}

export function algoSecondLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length < 2 || !lastTenResults[1]?.numbers) return [];
  return ensureUniqueNumbers([...lastTenResults[1].numbers], 6, 6); 
}

export function algoFrequentEven(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const evenNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 === 0 && frequencies[parseInt(numStr, 10)] > 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(evenNumbers.length, 10);
  return ensureUniqueNumbers(evenNumbers.slice(0, count), 1, 10);
}

export function algoFrequentOdd(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const oddNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 !== 0 && frequencies[parseInt(numStr, 10)] > 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(oddNumbers.length, 10);
  return ensureUniqueNumbers(oddNumbers.slice(0, count), 1, 10);
}

export function algoFrequentSmallZone(lastTenResults: HistoricalResult[]): TotoCombination {
   if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const smallZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num >= 1 && num <= 24 && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  const count = Math.min(smallZoneNumbers.length, 10);
  return ensureUniqueNumbers(smallZoneNumbers.slice(0, count), 1, 10);
}

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
  const count = Math.min(largeZoneNumbers.length, 10);
  return ensureUniqueNumbers(largeZoneNumbers.slice(0, count), 1, 10);
}

export function algoUniquePoolDeterministic(lastTenResults: HistoricalResult[]): TotoCombination {
  const uniquePoolSet: Set<number> = new Set();
  lastTenResults.forEach(result => {
    result.numbers.forEach(num => uniquePoolSet.add(num));
    if (result.additionalNumber) uniquePoolSet.add(result.additionalNumber);
  });
  
  if (uniquePoolSet.size === 0) return [];

  const poolArray = Array.from(uniquePoolSet).sort((a,b) => a - b);
  
  // Determine count: e.g., half the pool size, capped between 6 and 15, not exceeding 24
  let countToPick = Math.floor(poolArray.length / 2);
  countToPick = Math.max(1, Math.min(countToPick, 15)); // Ensure count is between 1-15 (example range)
  countToPick = Math.min(countToPick, poolArray.length); // Cannot pick more than available
  countToPick = Math.min(countToPick, 24); // Global max count

  return poolArray.slice(0, countToPick);
}

export function algoLuckyDipDeterministic(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) { // Fallback if no historical data to seed from
      return getDeterministicSequence(10, new Date().getDate(), (new Date().getMonth()+1));
  }
  // Deterministic count based on the number of historical results provided
  const countToPick = Math.max(1, Math.min(6 + (lastTenResults.length % 10), 24)); // e.g., 6-15 numbers

  // Seeds for deterministic sequence generation
  const seed1 = lastTenResults.reduce((sum, r) => sum + r.drawNumber, 0) % TOTO_NUMBER_RANGE.max || 1;
  const seed2 = lastTenResults.reduce((sum, r) => sum + r.additionalNumber, 0) % 10 || 1;
  
  return getDeterministicSequence(countToPick, seed1, seed2);
}

export interface NumberPickingTool {
  id: string;
  name: string;
  description: string;
  algorithmFn: (lastTenResults: HistoricalResult[]) => TotoCombination;
}
