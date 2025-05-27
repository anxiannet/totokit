
import type { HistoricalResult, TotoCombination } from './types';
import { TOTO_NUMBER_RANGE, TOTO_COMBINATION_LENGTH } from './types';

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
    if (includeAdditional) {
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

function getRandomNumbers(count: number, existingNumbers: number[] = []): number[] {
  const picked: Set<number> = new Set(existingNumbers);
  const randomPicks: number[] = [];
  
  while (randomPicks.length < count) {
    const num = Math.floor(Math.random() * TOTO_NUMBER_RANGE.max) + TOTO_NUMBER_RANGE.min;
    if (!picked.has(num)) {
      randomPicks.push(num);
      picked.add(num);
    }
  }
  return randomPicks;
}

function ensureUniqueSixNumbers(numbers: number[]): TotoCombination {
  const uniqueNumbers = Array.from(new Set(numbers));
  if (uniqueNumbers.length >= TOTO_COMBINATION_LENGTH) {
    return uniqueNumbers.slice(0, TOTO_COMBINATION_LENGTH);
  }
  const needed = TOTO_COMBINATION_LENGTH - uniqueNumbers.length;
  const randomFill = getRandomNumbers(needed, uniqueNumbers);
  return [...uniqueNumbers, ...randomFill];
}

// --- Algorithm Implementations ---

export function algoHotSix(lastTenResults: HistoricalResult[]): TotoCombination {
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'desc');
  return ensureUniqueSixNumbers(sorted.slice(0, TOTO_COMBINATION_LENGTH));
}

export function algoColdSix(lastTenResults: HistoricalResult[]): TotoCombination {
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'asc');
  return ensureUniqueSixNumbers(sorted.slice(0, TOTO_COMBINATION_LENGTH));
}

export function algoLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return getRandomNumbers(TOTO_COMBINATION_LENGTH);
  return ensureUniqueSixNumbers([...lastTenResults[0].numbers]);
}

export function algoSecondLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length < 2) return getRandomNumbers(TOTO_COMBINATION_LENGTH);
  return ensureUniqueSixNumbers([...lastTenResults[1].numbers]);
}

export function algoFrequentEven(lastTenResults: HistoricalResult[]): TotoCombination {
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const evenNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 === 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueSixNumbers(evenNumbers.slice(0, TOTO_COMBINATION_LENGTH));
}

export function algoFrequentOdd(lastTenResults: HistoricalResult[]): TotoCombination {
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const oddNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 !== 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueSixNumbers(oddNumbers.slice(0, TOTO_COMBINATION_LENGTH));
}

export function algoFrequentSmallZone(lastTenResults: HistoricalResult[]): TotoCombination {
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const smallZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) >= 1 && parseInt(numStr, 10) <= 24)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueSixNumbers(smallZoneNumbers.slice(0, TOTO_COMBINATION_LENGTH));
}

export function algoFrequentLargeZone(lastTenResults: HistoricalResult[]): TotoCombination {
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const largeZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) >= 25 && parseInt(numStr, 10) <= TOTO_NUMBER_RANGE.max)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueSixNumbers(largeZoneNumbers.slice(0, TOTO_COMBINATION_LENGTH));
}

export function algoUniquePoolRandom(lastTenResults: HistoricalResult[]): TotoCombination {
  const uniquePool: Set<number> = new Set();
  lastTenResults.forEach(result => {
    result.numbers.forEach(num => uniquePool.add(num));
    uniquePool.add(result.additionalNumber);
  });
  const poolArray = Array.from(uniquePool);
  
  if (poolArray.length < TOTO_COMBINATION_LENGTH) {
    const needed = TOTO_COMBINATION_LENGTH - poolArray.length;
    const randomFill = getRandomNumbers(needed, poolArray);
    return ensureUniqueSixNumbers([...poolArray, ...randomFill]);
  }

  // Shuffle and pick 6
  for (let i = poolArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolArray[i], poolArray[j]] = [poolArray[j], poolArray[i]];
  }
  return poolArray.slice(0, TOTO_COMBINATION_LENGTH);
}

export function algoLuckyDip(): TotoCombination {
  return getRandomNumbers(TOTO_COMBINATION_LENGTH);
}

export interface NumberPickingTool {
  id: string;
  name: string;
  description: string;
  algorithmFn: (lastTenResults: HistoricalResult[]) => TotoCombination;
}
