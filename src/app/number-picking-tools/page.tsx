
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
import type { HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { calculateHitDetails, getBallColor as getOfficialBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import { dynamicTools } from "@/lib/numberPickingAlgos"; // Import from new location
import { useState, useEffect } from "react";


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
  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA; 
  const [activeToolId, setActiveToolId] = useState<string>(""); 
  const [recentTenHistoricalDraws, setRecentTenHistoricalDraws] = useState<HistoricalResult[]>([]);

  useEffect(() => {
    // Determine the 10 most recent historical draws for display
    setRecentTenHistoricalDraws(allHistoricalData.slice(0, 10));
  }, [allHistoricalData]);


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
            探索多种选号工具。展开工具查看其算法描述，并对照最近10期历史开奖结果分析其动态预测表现。每个工具预测的号码数量可能不同 (1-24个)。预测结果基于历史数据确定性生成。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion 
            type="single" 
            collapsible 
            className="w-full space-y-3"
            value={activeToolId}
            onValueChange={setActiveToolId}
          >
            {dynamicTools.map((tool) => (
              <AccordionItem value={tool.id} key={tool.id} className="border bg-card shadow-sm rounded-lg">
                <AccordionTrigger className="text-base font-semibold hover:no-underline px-4 py-3">
                  {tool.name}
                </AccordionTrigger>
                <AccordionContent className="pt-2 px-4 pb-4">
                  <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                  
                  {activeToolId === tool.id && ( 
                    <>
                      <h4 className="text-sm font-semibold mb-2 mt-4">历史开奖动态预测表现 (最近10期):</h4>
                      {recentTenHistoricalDraws.length > 0 ? (
                        <ScrollArea className="h-[400px] border rounded-md p-3 space-y-4 bg-background/50">
                          {recentTenHistoricalDraws.map((targetDraw) => {
                            const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
                            if (originalIndex === -1) return null;

                            const precedingDrawsStartIndex = originalIndex + 1;
                            const precedingDrawsEndIndex = precedingDrawsStartIndex + 10; 
                            const precedingTenDraws = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

                            let predictedNumbersForTargetDraw: number[] = [];
                            // Special handling for algorithms that might not have enough preceding data
                            // For example, LastDrawRepeat needs at least 1 preceding, SecondLastDrawRepeat needs at least 2.
                            // Most algorithms are designed to handle `lastTenResults` being potentially shorter than 10.
                            if (tool.id === "dynamicLastDrawRepeat" && originalIndex >= allHistoricalData.length -1 ) {
                               // Not enough data for last draw repeat
                            } else if (tool.id === "dynamicSecondLastDrawRepeat" && originalIndex >= allHistoricalData.length - 2) {
                               // Not enough data for second last draw repeat
                            } else {
                               predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
                            }
                            
                            const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
                            const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
                                          ? (hitDetails.mainHitCount / Math.min(targetDraw.numbers.length, predictedNumbersForTargetDraw.length)) * 100 
                                          : 0; 
                            const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

                            return (
                              <div key={`${tool.id}-${targetDraw.drawNumber}`} className={`p-3 border rounded-lg ${hasAnyHit ? 'border-green-500/60 bg-green-500/10' : 'border-border bg-card'}`}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <p className="text-xs font-medium">
                                    目标期号: <span className="font-semibold text-primary">{targetDraw.drawNumber}</span> ({formatDateToLocale(targetDraw.date, zhCN)})
                                  </p>
                                  {predictedNumbersForTargetDraw.length > 0 && (hasAnyHit ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500/80" />)}
                                </div>
                                <div className="mb-1.5">
                                   <p className="text-xs text-muted-foreground mb-0.5">当期开奖号码:</p>
                                   <OfficialDrawDisplay draw={targetDraw} />
                                </div>
                                <div className="mb-1.5">
                                   <p className="text-xs text-muted-foreground mb-0.5">工具针对本期预测号码 ({predictedNumbersForTargetDraw.length} 个):</p>
                                   {predictedNumbersForTargetDraw.length > 0 ? (
                                     <NumberPickingToolDisplay
                                      numbers={predictedNumbersForTargetDraw}
                                      historicalResultForHighlight={targetDraw}
                                     />
                                   ) : (
                                     <p className="text-xs text-muted-foreground italic">数据不足或算法未生成预测</p>
                                   )}
                                </div>
                                {predictedNumbersForTargetDraw.length > 0 && (
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
                                      正码命中率 (对比官方正码数量): <span className="font-semibold">{hitRate.toFixed(1)}%</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">无历史数据可供分析。</p>
                      )}
                    </>
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

