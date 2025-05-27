
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

// Generates a deterministic sequence of unique numbers
function getDeterministicSequence(count: number, seed1: number, seed2: number): TotoCombination {
  const picked: Set<number> = new Set();
  let currentNum = seed1;
  const step = seed2 || 7; 

  // Adjust step if it's a multiple of 49 to avoid infinite loops with small counts
  const effectiveStep = (step % TOTO_NUMBER_RANGE.max === 0 && TOTO_NUMBER_RANGE.max > 0) ? 1 : step;


  let iterations = 0; // Safety counter
  const maxIterations = TOTO_NUMBER_RANGE.max * 2; // Allow for some collisions

  while (picked.size < count && iterations < maxIterations) {
    currentNum = (currentNum + effectiveStep -1);
    if (currentNum > TOTO_NUMBER_RANGE.max) {
        currentNum = (currentNum % TOTO_NUMBER_RANGE.max);
        if (currentNum === 0) currentNum = TOTO_NUMBER_RANGE.max;
    }
     if (currentNum < TOTO_NUMBER_RANGE.min) { // Should not happen with positive step
        currentNum = TOTO_NUMBER_RANGE.min;
    }


    if (!picked.has(currentNum)) {
      picked.add(currentNum);
    }
    iterations++;
    if (picked.size >= TOTO_NUMBER_RANGE.max && picked.size < count) break; // Stop if we've picked all possible numbers
  }
  return Array.from(picked).slice(0, count).sort((a, b) => a - b);
}


function ensureUniqueNumbers(numbers: number[], minCount: number = 1, maxCount: number = 24): TotoCombination {
  let uniqueNumbers = Array.from(new Set(numbers.filter(n => n >= TOTO_NUMBER_RANGE.min && n <= TOTO_NUMBER_RANGE.max)));
  uniqueNumbers.sort((a, b) => a - b);

  // If algorithm results in no numbers but minCount > 0, and we are not padding, return empty or what we have.
  // This helper should primarily enforce the maxCount.
  // The minCount is more of a guideline for algorithms; if they can't meet it, they return what they have.
  
  if (uniqueNumbers.length === 0 && minCount > 0) {
    return []; // If no numbers are generated, return empty. Padding with random is removed.
  }

  if (uniqueNumbers.length < minCount && uniqueNumbers.length > 0) {
    // Return the small set of unique numbers if it's less than minCount but not zero.
    // No padding to ensure determinism.
  }
  
  if (uniqueNumbers.length > maxCount) {
    return uniqueNumbers.slice(0, maxCount);
  }
  
  return uniqueNumbers;
}

// --- Algorithm Implementations ---

export function algoHotNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return []; 
  const frequencies = getNumberFrequencies(lastTenResults, false); 
  const sorted = getSortedNumbersByFrequency(frequencies, 'desc');
  const hot = sorted.filter(n => frequencies[n] > 0); // Only numbers that actually appeared
  return ensureUniqueNumbers(hot, 1, 10); // Up to 10 hottest numbers
}

export function algoColdNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'asc');
  
  // Prioritize numbers that appeared at least once but are "coldest" among them
  const appearedNumbers = sorted.filter(n => frequencies[n] > 0);
  
  if (appearedNumbers.length > 0) {
      return ensureUniqueNumbers(appearedNumbers, 1, 10); // Up to 10 coldest (but appeared) numbers
  }
  // Fallback: if no numbers appeared at all (unlikely with 10 results) or all have 0 frequency
  // This means all numbers are equally "cold" (0 frequency).
  // In this specific edge case for "Cold Numbers", we'll return an empty array
  // as there are no "cold" numbers among those that *have* appeared.
  // If the requirement was "least frequent overall", then we'd pick from zeroFrequencyNumbers.
  // But "cold" usually implies "cold among the active ones".
  // const zeroFrequencyNumbers = sorted.filter(n => frequencies[n] === 0);
  // return ensureUniqueNumbers(getDeterministicSequence(10, 1, 1), 1, 10); // Or pick a deterministic set
  return []; // No cold numbers if none have appeared or all are 0 freq.
}

export function algoLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0 || !lastTenResults[0]?.numbers) return [];
  // Deterministic: always return the 6 main numbers of the last draw
  return ensureUniqueNumbers([...lastTenResults[0].numbers], 6, 6); 
}

export function algoSecondLastDrawRepeat(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length < 2 || !lastTenResults[1]?.numbers) return [];
   // Deterministic: always return the 6 main numbers of the second to last draw
  return ensureUniqueNumbers([...lastTenResults[1].numbers], 6, 6); 
}

export function algoFrequentEven(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const evenNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 === 0 && frequencies[parseInt(numStr, 10)] > 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA) // Sort by frequency descending
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(evenNumbers, 1, 10); // Up to 10 most frequent even numbers
}

export function algoFrequentOdd(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const oddNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 !== 0 && frequencies[parseInt(numStr, 10)] > 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA) // Sort by frequency descending
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(oddNumbers, 1, 10); // Up to 10 most frequent odd numbers
}

export function algoFrequentSmallZone(lastTenResults: HistoricalResult[]): TotoCombination {
   if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const smallZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num >= TOTO_NUMBER_RANGE.min && num <= 24 && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA) // Sort by frequency descending
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(smallZoneNumbers, 1, 10); // Up to 10 most frequent small zone numbers
}

export function algoFrequentLargeZone(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const largeZoneNumbers = Object.entries(frequencies)
    .filter(([numStr]) => {
        const num = parseInt(numStr, 10);
        return num >= 25 && num <= TOTO_NUMBER_RANGE.max && frequencies[num] > 0;
    })
    .sort(([, freqA], [, freqB]) => freqB - freqA) // Sort by frequency descending
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(largeZoneNumbers, 1, 10); // Up to 10 most frequent large zone numbers
}

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
  countToPick = Math.max(1, Math.min(countToPick, 15)); 
  countToPick = Math.min(countToPick, poolArray.length); 
  countToPick = Math.min(countToPick, 24); 

  return poolArray.slice(0, countToPick);
}

export function algoLuckyDipDeterministic(lastTenResults: HistoricalResult[]): TotoCombination {
  // Deterministic count based on input length, e.g., 6 to 20 numbers. Capped at 24.
  // Min 1 if lastTenResults is empty.
  const countToPick = lastTenResults.length > 0 
                      ? Math.max(1, Math.min(6 + (lastTenResults.length % 15), 24)) 
                      : getDeterministicSequence(10, new Date().getDate(), (new Date().getMonth()+1)).length; // Fallback for 0 historical data

  if (lastTenResults.length === 0) { 
      // Fallback for no historical data: use current date parts as seeds
      const date = new Date();
      return getDeterministicSequence(countToPick, date.getDate(), (date.getMonth()+1)* (date.getFullYear()%100) );
  }
  
  // Seeds for deterministic sequence generation, ensuring they are not zero
  const seed1 = lastTenResults.reduce((sum, r) => sum + r.drawNumber, 0) % TOTO_NUMBER_RANGE.max || 1;
  const seed2 = lastTenResults.reduce((sum, r) => sum + r.additionalNumber, 0) % 13 || 1; // Use a prime for step
  
  return getDeterministicSequence(countToPick, seed1, seed2);
}

export interface NumberPickingTool {
  id: string;
  name: string;
  description: string;
  algorithmFn: (lastTenResults: HistoricalResult[]) => TotoCombination;
}

export const dynamicTools: NumberPickingTool[] = [
  {
    id: "dynamicHotNumbers",
    name: "热门追踪",
    description: "基于目标期前10期数据，统计最常出现的最多10个正码进行预测 (至少1个)。结果根据历史数据确定性生成。",
    algorithmFn: algoHotNumbers,
  },
  {
    id: "dynamicColdNumbers",
    name: "冷码挖掘",
    description: "基于目标期前10期数据，选择出现次数最少的最多10个正码进行预测 (至少1个)。结果根据历史数据确定性生成。",
    algorithmFn: algoColdNumbers,
  },
  {
    id: "dynamicLastDrawRepeat",
    name: "上期延续 (6码)",
    description: "预测号码直接采用目标期之前一期的6个中奖正码。若数据不足则不预测。结果确定性生成。",
    algorithmFn: algoLastDrawRepeat,
  },
  {
    id: "dynamicSecondLastDrawRepeat",
    name: "隔期重现 (6码)",
    description: "预测号码直接采用目标期之前第二期的6个中奖正码。若数据不足则不预测。结果确定性生成。",
    algorithmFn: algoSecondLastDrawRepeat, 
  },
  {
    id: "dynamicFrequentEven",
    name: "偶数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个偶数正码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentEven,
  },
  {
    id: "dynamicFrequentOdd",
    name: "奇数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个奇数正码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentOdd,
  },
  {
    id: "dynamicFrequentSmallZone",
    name: "小号区精选",
    description: "基于目标期前10期数据，选择1-24号范围内出现频率最高的最多10个号码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentSmallZone,
  },
  {
    id: "dynamicFrequentLargeZone",
    name: "大号区精选",
    description: "基于目标期前10期数据，选择25-49号范围内出现频率最高的最多10个号码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentLargeZone,
  },
  {
    id: "dynamicUniquePoolDeterministic",
    name: "综合池精选",
    description: "汇总目标期前10期所有出现过的号码（含特别号码，去重并排序），从中确定性地选出一组号码 (数量可变，最多15个)。结果确定性生成。",
    algorithmFn: algoUniquePoolDeterministic,
  },
  {
    id: "dynamicLuckyDipDeterministic",
    name: "幸运序列",
    description: "基于目标期前10期数据特征，以确定性算法生成一组号码 (数量可变，6-20个)。结果确定性生成。",
    algorithmFn: algoLuckyDipDeterministic,
  },
];

