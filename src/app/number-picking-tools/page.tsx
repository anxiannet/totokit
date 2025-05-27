
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Wand2 } from "lucide-react";
import type { TotoCombination } from "@/lib/types";
// Note: MOCK_HISTORICAL_DATA and algo functions are no longer directly used by this page for these tools
// import { MOCK_HISTORICAL_DATA } from "@/lib/types";
// import type { HistoricalResult } from "@/lib/types";
// import {
//   algoHotSix,
//   algoColdSix,
//   algoLastDrawRepeat,
//   algoSecondLastDrawRepeat,
//   algoFrequentEven,
//   algoFrequentOdd,
//   algoFrequentSmallZone,
//   algoFrequentLargeZone,
//   algoUniquePoolRandom,
//   algoLuckyDip,
// } from "@/lib/numberPickingAlgos";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";

interface FixedNumberPickingTool {
  id: string;
  name: string;
  description: string;
  predictedNumbers: TotoCombination;
}

const tools: FixedNumberPickingTool[] = [
  {
    id: "hotNumbersFixed",
    name: "精选热门组合",
    description: "根据对大量历史数据的统计分析，这组号码在特定周期内表现出较高的出现频率或关联性。适合追逐当前热点的玩家。",
    predictedNumbers: [7, 11, 19, 23, 34, 40, 48], // 7 numbers
  },
  {
    id: "coldNumbersFixed",
    name: "冷码回补精选",
    description: "基于长期未出现的“冷”号码有可能回补的原理，精选出具有潜在回归机会的号码组合。",
    predictedNumbers: [1, 6, 16, 26, 36, 46], // 6 numbers
  },
  {
    id: "lastDrawRelatedFixed",
    name: "上期延续参考",
    description: "上一期开奖结果中的部分号码或其特征有时会在下一期延续。这里提供一组与近期趋势有一定关联性的号码作为参考。",
    predictedNumbers: [4, 10, 14, 24, 30, 34, 40, 44], // 8 numbers
  },
  {
    id: "biDrawPatternFixed",
    name: "隔期模式观察",
    description: "观察TOTO历史数据，有时号码会出现隔期重复的模式。这组号码是基于此类观察的精选。",
    predictedNumbers: [3, 9, 13, 19, 23, 29, 33, 39, 43, 49], // 10 numbers
  },
  {
    id: "evenAdvantageFixed",
    name: "偶数优势策略",
    description: "精选一组偶数号码。统计学上，某些组合中偶数可能占据一定比例。",
    predictedNumbers: [2, 8, 12, 18, 22, 28, 32, 38, 42, 48], // 10 numbers
  },
  {
    id: "oddCoreFixed",
    name: "奇数核心策略",
    description: "精选一组奇数号码。与偶数策略对应，关注奇数在组合中的表现。",
    predictedNumbers: [1, 7, 11, 17, 21, 27, 31, 37, 41, 47], // 10 numbers
  },
  {
    id: "smallZonePotentialFixed",
    name: "小号区潜力股",
    description: "号码1-24为小区。这组号码是小区内经过筛选的潜力组合。",
    predictedNumbers: [3, 5, 7, 9, 12, 15, 18, 20, 21, 24], // 10 numbers
  },
  {
    id: "largeZoneSelectedFixed",
    name: "大号区精选集",
    description: "号码25-49为大区。这组号码是大区内经过筛选的潜力组合。",
    predictedNumbers: [25, 28, 30, 33, 35, 37, 40, 42, 44, 47], // 10 numbers
  },
  {
    id: "balancedComprehensiveFixed",
    name: "综合平衡选号",
    description: "这组号码综合考虑了多种因素（如奇偶、大小分布等），旨在提供一个相对平衡的号码池选择。",
    predictedNumbers: [1, 4, 6, 9, 10, 14, 15, 18, 20, 23, 27, 31, 33, 36, 40, 41, 45, 49], // 18 numbers
  },
  {
    id: "luckyStarFixed",
    name: "固定幸运星组合",
    description: "一组特别挑选的固定幸运号码，覆盖多个数字区域，希望能为您带来意想不到的好运。",
    predictedNumbers: [5, 6, 8, 10, 12, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 35, 36, 38, 40, 42, 44, 45], // 24 numbers
  },
];

export default function NumberPickingToolsPage() {
  // No longer need state for generated numbers as they are fixed
  // const [generatedNumbers, setGeneratedNumbers] = useState<Record<string, TotoCombination | null>>({});

  // No longer need handleGenerate function
  // const handleGenerate = (toolId: string, algorithmFn: (data: HistoricalResult[]) => TotoCombination) => {
  //   const result = algorithmFn(lastTenResults);
  //   setGeneratedNumbers(prev => ({ ...prev, [toolId]: result }));
  // };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            选号工具箱
          </CardTitle>
          <CardDescription>
            探索多种基于不同策略的选号工具，为您提供选号灵感。以下工具提供固定号码组合。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {tools.map((tool) => (
              <AccordionItem value={tool.id} key={tool.id} className="border bg-card shadow-sm rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  {tool.name}
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                  {/* "Generate" button removed */}
                  <NumberPickingToolDisplay numbers={tool.predictedNumbers} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
