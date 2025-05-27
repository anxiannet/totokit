
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wand2, TrendingUp, TrendingDown } from "lucide-react";
import type { TotoCombination, HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { calculateHitDetails, getBallColor as getOfficialBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import {
  algoHotNumbers,
  algoColdNumbers,
  algoLastDrawRepeat,
  algoSecondLastDrawRepeat,
  algoFrequentEven,
  algoFrequentOdd,
  algoFrequentSmallZone,
  algoFrequentLargeZone,
  algoUniquePoolRandom,
  algoLuckyDip,
  type NumberPickingTool as DynamicNumberPickingTool,
} from "@/lib/numberPickingAlgos";


const dynamicTools: DynamicNumberPickingTool[] = [
  {
    id: "dynamicHotNumbers",
    name: "动态热门追踪",
    description: "基于目标期前10期数据，统计最常出现的最多10个正码进行预测 (至少1个)。",
    algorithmFn: algoHotNumbers,
  },
  {
    id: "dynamicColdNumbers",
    name: "动态冷码挖掘",
    description: "基于目标期前10期数据，选择出现次数最少的最多10个正码进行预测 (至少1个)。",
    algorithmFn: algoColdNumbers,
  },
  {
    id: "dynamicLastDrawRepeat",
    name: "动态上期延续 (6码)",
    description: "预测号码直接采用目标期之前一期的6个中奖正码。",
    algorithmFn: algoLastDrawRepeat,
  },
  {
    id: "dynamicSecondLastDrawRepeat",
    name: "动态隔期重现 (6码)",
    description: "预测号码直接采用目标期之前第二期的6个中奖正码。",
    algorithmFn: algoSecondLastDrawRepeat, 
  },
  {
    id: "dynamicFrequentEven",
    name: "动态偶数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个偶数正码 (至少1个)。",
    algorithmFn: algoFrequentEven,
  },
  {
    id: "dynamicFrequentOdd",
    name: "动态奇数偏好",
    description: "基于目标期前10期数据，选择出现频率最高的最多10个奇数正码 (至少1个)。",
    algorithmFn: algoFrequentOdd,
  },
  {
    id: "dynamicFrequentSmallZone",
    name: "动态小号区精选",
    description: "基于目标期前10期数据，选择1-24号范围内出现频率最高的最多10个号码 (至少1个)。",
    algorithmFn: algoFrequentSmallZone,
  },
  {
    id: "dynamicFrequentLargeZone",
    name: "动态大号区精选",
    description: "基于目标期前10期数据，选择25-49号范围内出现频率最高的最多10个号码 (至少1个)。",
    algorithmFn: algoFrequentLargeZone,
  },
  {
    id: "dynamicUniquePoolRandom",
    name: "动态综合随机池",
    description: "汇总目标期前10期所有出现过的号码（含特别号码，去重），从中随机选出一组号码 (6-20个，不超过池大小)。",
    algorithmFn: algoUniquePoolRandom,
  },
  {
    id: "dynamicLuckyDip",
    name: "动态幸运一搏",
    description: "完全随机生成一组号码 (6-24个)，不参考目标期前的历史数据。",
    algorithmFn: algoLuckyDip,
  },
];

const OfficialDrawDisplay = ({ draw }: { draw: HistoricalResult }) => (
  <div className="flex flex-wrap gap-1.5 items-center">
    {draw.numbers.map(num => (
      <Badge key={`official-${draw.drawNumber}-main-${num}`} className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(num, false)}`}>
        {num}
      </Badge>
    ))}
    <span className="mx-1 text-muted-foreground">+</span>
    <Badge className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(draw.additionalNumber, true)}`}>
      {draw.additionalNumber}
    </Badge>
  </div>
);

export default function NumberPickingToolsPage() {
  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA; // Already sorted descending by drawNumber

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
            选号工具箱 (动态预测)
          </CardTitle>
          <CardDescription>
            探索多种选号工具。展开工具查看其算法描述，并对照历史开奖结果分析其动态预测表现。每个工具预测的号码数量可能不同 (1-24个)。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {dynamicTools.map((tool) => (
              <AccordionItem value={tool.id} key={tool.id} className="border bg-card shadow-sm rounded-lg">
                <AccordionTrigger className="text-base font-semibold hover:no-underline px-4 py-3">
                  {tool.name}
                </AccordionTrigger>
                <AccordionContent className="pt-2 px-4 pb-4">
                  <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                  
                  <h4 className="text-sm font-semibold mb-2 mt-4">历史开奖动态预测表现:</h4>
                  {allHistoricalData.length > 0 ? (
                    <ScrollArea className="h-[400px] border rounded-md p-3 space-y-4 bg-background/50">
                      {allHistoricalData.map((targetDraw, index) => {
                        const precedingDrawsStartIndex = index + 1;
                        const precedingDrawsEndIndex = index + 1 + 10;
                        const precedingTenDraws = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

                        const predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
                        
                        const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
                        // Hit rate calculation needs to be relative to the number of predicted numbers if we want to normalize
                        // Or, keep it simple: how many of the 6 official main numbers were hit.
                        // For now, let's keep it based on hitting the 6 official main numbers.
                        const hitRate = targetDraw.numbers && targetDraw.numbers.length > 0 ? (hitDetails.mainHitCount / targetDraw.numbers.length) * 100 : 0;
                        const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

                        return (
                          <div key={`${tool.id}-${targetDraw.drawNumber}`} className={`p-3 border rounded-lg ${hasAnyHit ? 'border-green-500/60 bg-green-500/10' : 'border-border bg-card'}`}>
                            <div className="flex justify-between items-center mb-1.5">
                              <p className="text-xs font-medium">
                                目标期号: <span className="font-semibold text-primary">{targetDraw.drawNumber}</span> ({formatDateToLocale(targetDraw.date, zhCN)})
                              </p>
                              {hasAnyHit ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500/80" />}
                            </div>
                            <div className="mb-1.5">
                               <p className="text-xs text-muted-foreground mb-0.5">当期开奖号码:</p>
                               <OfficialDrawDisplay draw={targetDraw} />
                            </div>
                            <div className="mb-1.5">
                               <p className="text-xs text-muted-foreground mb-0.5">工具针对本期预测号码 ({predictedNumbersForTargetDraw.length} 个):</p>
                               <NumberPickingToolDisplay
                                numbers={predictedNumbersForTargetDraw}
                                historicalResultForHighlight={targetDraw}
                               />
                            </div>
                            <div className="text-xs space-y-0.5 text-foreground/90">
                              <p>
                                命中正码: <span className="font-semibold">{hitDetails.mainHitCount}</span> 个
                                {hitDetails.matchedMainNumbers.length > 0 ? ` (${hitDetails.matchedMainNumbers.join(", ")})` : ''}
                              </p>
                              <p>
                                特别号码 ({targetDraw.additionalNumber}): {hitDetails.matchedAdditionalNumberDetails.matched ? 
                                    <span className="font-semibold text-yellow-600">命中</span> : 
                                    <span className="text-muted-foreground">未命中</span>
                                }
                              </p>
                              <p>
                                正码命中率 (对比6个官方正码): <span className="font-semibold">{hitRate.toFixed(1)}%</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">无历史数据可供分析。</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
