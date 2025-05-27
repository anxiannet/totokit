
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
    if (picked.size >= TOTO_NUMBER_RANGE.max && picked.size < count) break;
  }
  return Array.from(picked).slice(0, count).sort((a, b) => a - b);
}


function ensureUniqueNumbers(numbers: number[], minCount: number = 1, maxCount: number = 24): TotoCombination {
  let uniqueNumbers = Array.from(new Set(numbers.filter(n => n >= TOTO_NUMBER_RANGE.min && n <= TOTO_NUMBER_RANGE.max)));
  uniqueNumbers.sort((a, b) => a - b);

  if (uniqueNumbers.length < minCount && uniqueNumbers.length > 0) {
    // If we have some numbers but less than minCount, return what we have (no padding for deterministic algos)
    // This part is primarily for ensuring the list is capped at maxCount
  } else if (uniqueNumbers.length === 0 && minCount > 0) {
    // If algorithm results in no numbers but minCount > 0, behavior depends on specific algo.
    // For generic helper, we return empty. Specific algos might add fallback.
    return [];
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
  return ensureUniqueNumbers(hot, 1, 10);
}

export function algoColdNumbers(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const sorted = getSortedNumbersByFrequency(frequencies, 'asc');
  
  // Prioritize numbers that appeared at least once but are "coldest" among them
  const appearedNumbers = sorted.filter(n => frequencies[n] > 0);
  const coldFromAppeared = appearedNumbers; // Sorted ascending by frequency

  if (coldFromAppeared.length > 0) {
      return ensureUniqueNumbers(coldFromAppeared, 1, 10);
  }
  // Fallback: if no numbers appeared at all (unlikely with 10 results) or all have 0 frequency
  const zeroFrequencyNumbers = sorted.filter(n => frequencies[n] === 0);
  return ensureUniqueNumbers(zeroFrequencyNumbers, 1, 10);
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
  return ensureUniqueNumbers(evenNumbers, 1, 10);
}

export function algoFrequentOdd(lastTenResults: HistoricalResult[]): TotoCombination {
  if (lastTenResults.length === 0) return [];
  const frequencies = getNumberFrequencies(lastTenResults, false);
  const oddNumbers = Object.entries(frequencies)
    .filter(([numStr]) => parseInt(numStr, 10) % 2 !== 0 && frequencies[parseInt(numStr, 10)] > 0)
    .sort(([, freqA], [, freqB]) => freqB - freqA) // Sort by frequency descending
    .map(([numStr]) => parseInt(numStr, 10));
  return ensureUniqueNumbers(oddNumbers, 1, 10);
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
  return ensureUniqueNumbers(smallZoneNumbers, 1, 10);
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
  return ensureUniqueNumbers(largeZoneNumbers, 1, 10);
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
  if (lastTenResults.length === 0) { 
      // Fallback for no historical data: use current date parts as seeds
      const date = new Date();
      return getDeterministicSequence(10, date.getDate(), (date.getMonth()+1)* (date.getFullYear()%100) );
  }
  
  const countToPick = Math.max(1, Math.min(6 + (lastTenResults.length % 15), 24)); // e.g., 6-20 numbers

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
    name: "动态热门追踪",
    description: "基于目标期前10期数据，统计最常出现的最多10个正码进行预测 (至少1个，若无则不预测)。结果固定。",
    algorithmFn: algoHotNumbers,
  },
  {
    id: "dynamicColdNumbers",
    name: "动态冷码挖掘",
    description: "基于目标期前10期数据，选择出现次数最少的最多10个正码进行预测 (至少1个，若无则不预测)。结果固定。",
    algorithmFn: algoColdNumbers,
  },
  {
    id: "dynamicLastDrawRepeat",
    name: "动态上期延续 (6码)",
    description: "预测号码直接采用目标期之前一期的6个中奖正码。若数据不足则不预测。结果固定。",
    algorithmFn: algoLastDrawRepeat,
  },
  {
    id: "dynamicSecondLastDrawRepeat",
    name: "动态隔期重现 (6码)",
    description: "预测号码直接采用目标期之前第二期的6个中奖正码。若数据不足则不预测。结果固定。",
    algorithmFn: algoSecondLastDrawRepeat, 
  },
  {
    id: "dynamicFrequentEven",
    name: "动态偶数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个偶数正码 (至少1个，若无则不预测)。结果固定。",
    algorithmFn: algoFrequentEven,
  },
  {
    id: "dynamicFrequentOdd",
    name: "动态奇数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个奇数正码 (至少1个，若无则不预测)。结果固定。",
    algorithmFn: algoFrequentOdd,
  },
  {
    id: "dynamicFrequentSmallZone",
    name: "动态小号区精选",
    description: "基于目标期前10期数据，选择1-24号范围内出现频率最高的最多10个号码 (至少1个，若无则不预测)。结果固定。",
    algorithmFn: algoFrequentSmallZone,
  },
  {
    id: "dynamicFrequentLargeZone",
    name: "动态大号区精选",
    description: "基于目标期前10期数据，选择25-49号范围内出现频率最高的最多10个号码 (至少1个，若无则不预测)。结果固定。",
    algorithmFn: algoFrequentLargeZone,
  },
  {
    id: "dynamicUniquePoolDeterministic",
    name: "动态综合池精选",
    description: "汇总目标期前10期所有出现过的号码（含特别号码，去重并排序），从中确定性地选出一组号码 (数量可变，最多15个)。结果固定。",
    algorithmFn: algoUniquePoolDeterministic,
  },
  {
    id: "dynamicLuckyDipDeterministic",
    name: "动态幸运序列",
    description: "基于目标期前10期数据特征，以确定性算法生成一组号码 (数量可变，6-20个)。结果固定。",
    algorithmFn: algoLuckyDipDeterministic,
  },
];
