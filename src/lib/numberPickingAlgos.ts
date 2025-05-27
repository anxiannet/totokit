
import type { HistoricalResult, TotoCombination } from './types';
import { algoHotNumbers } from './numberPickingAlgos/algorithms/hotNumbers';
import { algoColdNumbers } from './numberPickingAlgos/algorithms/coldNumbers';
import { algoLastDrawRepeat } from './numberPickingAlgos/algorithms/lastDrawRepeat';
import { algoSecondLastDrawRepeat } from './numberPickingAlgos/algorithms/secondLastDrawRepeat';
import { algoFrequentEven } from './numberPickingAlgos/algorithms/frequentEven';
import { algoFrequentOdd } from './numberPickingAlgos/algorithms/frequentOdd';
import { algoFrequentSmallZone } from './numberPickingAlgos/algorithms/frequentSmallZone';
import { algoFrequentLargeZone } from './numberPickingAlgos/algorithms/frequentLargeZone';
import { algoUniquePoolDeterministic } from './numberPickingAlgos/algorithms/uniquePoolDeterministic';
import { algoLuckyDipDeterministic } from './numberPickingAlgos/algorithms/luckyDipDeterministic';


export interface NumberPickingTool {
  id: string;
  name: string;
  description: string;
  algorithmFn: (lastTenResults: HistoricalResult[]) => TotoCombination;
}

export const dynamicTools: NumberPickingTool[] = [
  {
    id: "hotNumbers",
    name: "热门追踪",
    description: "基于目标期前10期数据，统计最常出现的最多10个正码进行预测 (至少1个)。结果根据历史数据确定性生成。",
    algorithmFn: algoHotNumbers,
  },
  {
    id: "coldNumbers",
    name: "冷码挖掘",
    description: "基于目标期前10期数据，选择出现次数最少的最多10个正码进行预测 (至少1个)。结果根据历史数据确定性生成。",
    algorithmFn: algoColdNumbers,
  },
  {
    id: "lastDrawRepeat",
    name: "上期延续",
    description: "预测号码直接采用目标期之前一期的6个中奖正码。若数据不足则采用固定备用号码。结果确定性生成。",
    algorithmFn: algoLastDrawRepeat,
  },
  {
    id: "secondLastDrawRepeat",
    name: "隔期重现",
    description: "预测号码直接采用目标期之前第二期的6个中奖正码。若数据不足则采用固定备用号码。结果确定性生成。",
    algorithmFn: algoSecondLastDrawRepeat,
  },
  {
    id: "frequentEven",
    name: "偶数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个偶数正码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentEven,
  },
  {
    id: "frequentOdd",
    name: "奇数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个奇数正码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentOdd,
  },
  {
    id: "frequentSmallZone",
    name: "小号区精选",
    description: "基于目标期前10期数据，选择1-24号范围内出现频率最高的最多10个号码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentSmallZone,
  },
  {
    id: "frequentLargeZone",
    name: "大号区精选",
    description: "基于目标期前10期数据，选择25-49号范围内出现频率最高的最多10个号码 (至少1个)。结果确定性生成。",
    algorithmFn: algoFrequentLargeZone,
  },
  {
    id: "uniquePoolDeterministic",
    name: "综合池精选",
    description: "汇总目标期前10期所有出现过的号码（含特别号码，去重并排序），从中确定性地选出一组号码 (数量可变，最多15个)。结果确定性生成。",
    algorithmFn: algoUniquePoolDeterministic,
  },
  {
    id: "luckyDipDeterministic",
    name: "幸运序列",
    description: "基于目标期前10期数据特征，以确定性算法生成一组号码 (数量可变，1-24个)。结果确定性生成。",
    algorithmFn: algoLuckyDipDeterministic,
  },
];
