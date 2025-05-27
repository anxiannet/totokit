
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
import { ArrowLeft, Wand2, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { TotoCombination, HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { calculateHitDetails, getBallColor as getOfficialBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";

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
    predictedNumbers: [7, 11, 19, 23, 34, 40, 48], 
  },
  {
    id: "coldNumbersFixed",
    name: "冷码回补精选",
    description: "基于长期未出现的“冷”号码有可能回补的原理，精选出具有潜在回归机会的号码组合。",
    predictedNumbers: [1, 6, 16, 26, 36, 46], 
  },
  {
    id: "lastDrawRelatedFixed",
    name: "上期延续参考",
    description: "上一期开奖结果中的部分号码或其特征有时会在下一期延续。这里提供一组与近期趋势有一定关联性的号码作为参考。",
    predictedNumbers: [4, 10, 14, 24, 30, 34, 40, 44], 
  },
  {
    id: "biDrawPatternFixed",
    name: "隔期模式观察",
    description: "观察TOTO历史数据，有时号码会出现隔期重复的模式。这组号码是基于此类观察的精选。",
    predictedNumbers: [3, 9, 13, 19, 23, 29, 33, 39, 43, 49], 
  },
  {
    id: "evenAdvantageFixed",
    name: "偶数优势策略",
    description: "精选一组偶数号码。统计学上，某些组合中偶数可能占据一定比例。",
    predictedNumbers: [2, 8, 12, 18, 22, 28, 32, 38, 42, 48], 
  },
  {
    id: "oddCoreFixed",
    name: "奇数核心策略",
    description: "精选一组奇数号码。与偶数策略对应，关注奇数在组合中的表现。",
    predictedNumbers: [1, 7, 11, 17, 21, 27, 31, 37, 41, 47], 
  },
  {
    id: "smallZonePotentialFixed",
    name: "小号区潜力股",
    description: "号码1-24为小区。这组号码是小区内经过筛选的潜力组合。",
    predictedNumbers: [3, 5, 7, 9, 12, 15, 18, 20, 21, 24], 
  },
  {
    id: "largeZoneSelectedFixed",
    name: "大号区精选集",
    description: "号码25-49为大区。这组号码是大区内经过筛选的潜力组合。",
    predictedNumbers: [25, 28, 30, 33, 35, 37, 40, 42, 44, 47], 
  },
  {
    id: "balancedComprehensiveFixed",
    name: "综合平衡选号",
    description: "这组号码综合考虑了多种因素（如奇偶、大小分布等），旨在提供一个相对平衡的号码池选择。",
    predictedNumbers: [1, 4, 6, 9, 10, 14, 15, 18, 20, 23, 27, 31, 33, 36, 40, 41, 45, 49], 
  },
  {
    id: "luckyStarFixed",
    name: "固定幸运星组合",
    description: "一组特别挑选的固定幸运号码，覆盖多个数字区域，希望能为您带来意想不到的好运。",
    predictedNumbers: [5, 6, 8, 10, 12, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 35, 36, 38, 40, 42, 44, 45], 
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
  const historicalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;

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
            探索多种基于不同策略的选号工具。展开工具查看其固定号码，并对照历史开奖结果分析其表现。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {tools.map((tool) => (
              <AccordionItem value={tool.id} key={tool.id} className="border bg-card shadow-sm rounded-lg">
                <AccordionTrigger className="text-base font-semibold hover:no-underline px-4 py-3">
                  {tool.name}
                </AccordionTrigger>
                <AccordionContent className="pt-2 px-4 pb-4">
                  <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                  <div className="mb-3 p-3 bg-muted/30 rounded-md">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">工具固定号码 ({tool.predictedNumbers.length}个):</h4>
                    <NumberPickingToolDisplay numbers={tool.predictedNumbers} defaultBallColor="bg-sky-500 text-white" />
                  </div>

                  <h4 className="text-sm font-semibold mb-2 mt-4">历史开奖对照表现:</h4>
                  {historicalData.length > 0 ? (
                    <ScrollArea className="h-[400px] border rounded-md p-3 space-y-4 bg-background/50">
                      {historicalData.map((draw) => {
                        const hitDetails = calculateHitDetails(tool.predictedNumbers, draw);
                        // Ensure draw.numbers is not empty to avoid division by zero
                        const hitRate = draw.numbers && draw.numbers.length > 0 ? (hitDetails.mainHitCount / draw.numbers.length) * 100 : 0;
                        const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

                        return (
                          <div key={`${tool.id}-${draw.drawNumber}`} className={`p-3 border rounded-lg ${hasAnyHit ? 'border-green-500/60 bg-green-500/10' : 'border-border bg-card'}`}>
                            <div className="flex justify-between items-center mb-1.5">
                              <p className="text-xs font-medium">
                                对照期号: <span className="font-semibold text-primary">{draw.drawNumber}</span> ({formatDateToLocale(draw.date, zhCN)})
                              </p>
                              {hasAnyHit ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500/80" />}
                            </div>
                            <div className="mb-1.5">
                               <p className="text-xs text-muted-foreground mb-0.5">当期开奖号码:</p>
                               <OfficialDrawDisplay draw={draw} />
                            </div>
                            <div className="mb-1.5">
                               <p className="text-xs text-muted-foreground mb-0.5">工具号码命中情况 (共 {tool.predictedNumbers.length} 个):</p>
                               <NumberPickingToolDisplay
                                numbers={tool.predictedNumbers}
                                historicalResultForHighlight={draw}
                               />
                            </div>
                            <div className="text-xs space-y-0.5 text-foreground/90">
                              <p>
                                命中正码: <span className="font-semibold">{hitDetails.mainHitCount}</span> 个
                                {hitDetails.matchedMainNumbers.length > 0 ? ` (${hitDetails.matchedMainNumbers.join(", ")})` : ''}
                              </p>
                              <p>
                                特别号码 ({draw.additionalNumber}): {hitDetails.matchedAdditionalNumberDetails.matched ? 
                                    <span className="font-semibold text-yellow-600">命中</span> : 
                                    <span className="text-muted-foreground">未命中</span>
                                }
                              </p>
                              <p>
                                正码命中率 (基于6个正码): <span className="font-semibold">{hitRate.toFixed(1)}%</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">无历史数据可供对照。</p>
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
