
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Wand2, Shuffle } from "lucide-react";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import type { HistoricalResult, TotoCombination } from "@/lib/types";
import {
  algoHotSix,
  algoColdSix,
  algoLastDrawRepeat,
  algoSecondLastDrawRepeat,
  algoFrequentEven,
  algoFrequentOdd,
  algoFrequentSmallZone,
  algoFrequentLargeZone,
  algoUniquePoolRandom,
  algoLuckyDip,
  type NumberPickingTool,
} from "@/lib/numberPickingAlgos";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";

const lastTenResults: HistoricalResult[] = MOCK_HISTORICAL_DATA.slice(0, 10);

const tools: NumberPickingTool[] = [
  {
    id: "hotSix",
    name: "热门六码",
    description: "选取最近10期中奖正码（不含特别号码）中出现频率最高的6个号码。若频率相同，则优先选择数值较小的号码。",
    algorithmFn: algoHotSix,
  },
  {
    id: "coldSix",
    name: "冷门六码",
    description: "选取最近10期中奖正码中出现频率最低的6个号码。若不足6个，则随机补齐。",
    algorithmFn: algoColdSix,
  },
  {
    id: "lastDrawRepeat",
    name: "追蹤上期",
    description: "直接选用上一期的6个中奖正码作为预测结果。",
    algorithmFn: algoLastDrawRepeat,
  },
  {
    id: "secondLastDrawRepeat",
    name: "追蹤前两期",
    description: "直接选用上上期（即前第二期）的6个中奖正码作为预测结果。",
    algorithmFn: algoSecondLastDrawRepeat,
  },
  {
    id: "frequentEven",
    name: "旺偶数组合",
    description: "选取最近10期中奖正码中出现频率最高的6个偶数号码。",
    algorithmFn: algoFrequentEven,
  },
  {
    id: "frequentOdd",
    name: "旺奇数组合",
    description: "选取最近10期中奖正码中出现频率最高的6个奇数号码。",
    algorithmFn: algoFrequentOdd,
  },
  {
    id: "frequentSmallZone",
    name: "小区强号",
    description: "选取最近10期中奖正码中，号码范围在1-24之间出现频率最高的6个号码。",
    algorithmFn: algoFrequentSmallZone,
  },
  {
    id: "frequentLargeZone",
    name: "大区强号",
    description: "选取最近10期中奖正码中，号码范围在25-49之间出现频率最高的6个号码。",
    algorithmFn: algoFrequentLargeZone,
  },
  {
    id: "uniquePoolRandom",
    name: "精华随机选",
    description: "汇总最近10期所有出现过的正码和特别号码（去重），形成一个号码池，从中随机挑选6个号码。",
    algorithmFn: algoUniquePoolRandom,
  },
  {
    id: "luckyDip",
    name: "幸运随机注",
    description: "完全随机生成6个1-49之间的号码，不参考任何历史数据。",
    algorithmFn: () => algoLuckyDip(), // algoLuckyDip doesn't need historical data
  },
];

export default function NumberPickingToolsPage() {
  const [generatedNumbers, setGeneratedNumbers] = useState<Record<string, TotoCombination | null>>({});

  const handleGenerate = (toolId: string, algorithmFn: (data: HistoricalResult[]) => TotoCombination) => {
    const result = algorithmFn(lastTenResults);
    setGeneratedNumbers(prev => ({ ...prev, [toolId]: result }));
  };

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
            探索多种基于不同策略的选号工具，为您提供选号灵感。
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
                  <Button
                    onClick={() => handleGenerate(tool.id, tool.algorithmFn)}
                    size="sm"
                    className="mb-2"
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    生成号码
                  </Button>
                  <NumberPickingToolDisplay numbers={generatedNumbers[tool.id] || null} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
