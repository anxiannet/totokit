
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import {
  calculateHitDetails,
  getBallColor as getOfficialBallColor,
  formatDateToLocale,
} from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import { dynamicTools, type NumberPickingTool } from "@/lib/numberPickingAlgos";
import { useEffect, useState } from "react";

const OfficialDrawDisplay = ({ draw }: { draw: HistoricalResult }) => (
  <div className="flex flex-wrap gap-1.5 items-center">
    {draw.numbers.map((num) => (
      <Badge
        key={`official-${draw.drawNumber}-main-${num}`}
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(
          num,
          false
        )}`}
      >
        {num}
      </Badge>
    ))}
    <span className="mx-1 text-muted-foreground">+</span>
    <Badge
      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(
        draw.additionalNumber,
        true
      )}`}
    >
      {draw.additionalNumber}
    </Badge>
  </div>
);

// This function tells Next.js which `toolId`s are valid
// It should be defined at the top level of the module, not inside the component.
export async function generateStaticParams() {
  return dynamicTools.map((tool) => ({
    toolId: tool.id,
  }));
}

export default function SingleNumberToolPage({
  params,
}: {
  params: { toolId: string };
}) {
  const { toolId } = params;
  const [tool, setTool] = useState<NumberPickingTool | undefined>(undefined);
  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;
  const [recentTenHistoricalDraws, setRecentTenHistoricalDraws] = useState<
    HistoricalResult[]
  >([]);

  useEffect(() => {
    const foundTool = dynamicTools.find((t) => t.id === toolId);
    setTool(foundTool);
    // Determine the 10 most recent historical draws for display
    setRecentTenHistoricalDraws(allHistoricalData.slice(0, 10));
  }, [toolId, allHistoricalData]);

  if (tool === undefined) { // Check for undefined specifically for initial state or not found
    // This can briefly show if tool takes a moment to be found by useEffect
    // For a truly "not found" state after useEffect, you might want a different loading/error handling
    return (
        <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 text-center">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl mb-4">正在加载工具信息或工具未找到...</p>
            <Button asChild variant="outline">
              <Link href="/number-picking-tools">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回工具列表
              </Link>
            </Button>
          </div>
        </div>
      );
  }
  
  if (tool === null) { // Explicitly null if not found after trying
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 text-center">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
           <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-xl mb-4 text-destructive-foreground">工具未找到</p>
          <Button asChild variant="outline">
            <Link href="/number-picking-tools">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回工具列表
            </Link>
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/number-picking-tools">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工具列表
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {/* Placeholder for potential tool icon */}
            {tool.name}
          </CardTitle>
          <CardDescription>{tool.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <h4 className="text-md font-semibold mb-2 mt-4">
            历史开奖动态预测表现 (最近10期):
          </h4>
          {recentTenHistoricalDraws.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-400px)] rounded-md border p-3 space-y-4 bg-background/50">
              {recentTenHistoricalDraws.map((targetDraw) => {
                const originalIndex = allHistoricalData.findIndex(
                  (d) => d.drawNumber === targetDraw.drawNumber
                );
                if (originalIndex === -1) return null;

                const precedingDrawsStartIndex = originalIndex + 1;
                const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
                const precedingTenDraws = allHistoricalData.slice(
                  precedingDrawsStartIndex,
                  precedingDrawsEndIndex
                );

                let predictedNumbersForTargetDraw: number[] = [];
                 if (tool.algorithmFn) {
                    predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
                } else {
                    console.warn(`Algorithm function for tool ${tool.id} is undefined.`);
                }


                const hitDetails = calculateHitDetails(
                  predictedNumbersForTargetDraw,
                  targetDraw
                );
                const hitRate =
                  targetDraw.numbers.length > 0 &&
                  predictedNumbersForTargetDraw.length > 0
                    ? (hitDetails.mainHitCount /
                        Math.min(
                          targetDraw.numbers.length,
                          predictedNumbersForTargetDraw.length
                        )) *
                      100
                    : 0;
                const hasAnyHit =
                  hitDetails.mainHitCount > 0 ||
                  hitDetails.matchedAdditionalNumberDetails.matched;

                return (
                  <div
                    key={`${tool.id}-${targetDraw.drawNumber}`}
                    className={`p-3 border rounded-lg ${
                      hasAnyHit
                        ? "border-green-500/60 bg-green-500/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-xs font-medium">
                        目标期号:{" "}
                        <span className="font-semibold text-primary">
                          {targetDraw.drawNumber}
                        </span>{" "}
                        ({formatDateToLocale(targetDraw.date, zhCN)})
                      </p>
                      {predictedNumbersForTargetDraw.length > 0 &&
                        (hasAnyHit ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500/80" />
                        ))}
                    </div>
                    <div className="mb-1.5">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        当期开奖号码:
                      </p>
                      <OfficialDrawDisplay draw={targetDraw} />
                    </div>
                    <div className="mb-1.5">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        工具针对本期预测号码 ({predictedNumbersForTargetDraw.length}{" "}
                        个):
                      </p>
                      {predictedNumbersForTargetDraw.length > 0 ? (
                        <NumberPickingToolDisplay
                          numbers={predictedNumbersForTargetDraw}
                          historicalResultForHighlight={targetDraw}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          数据不足或算法未生成预测
                        </p>
                      )}
                    </div>
                    {predictedNumbersForTargetDraw.length > 0 && (
                      <div className="text-xs space-y-0.5 text-foreground/90">
                        <p>
                          命中正码:{" "}
                          <span className="font-semibold">
                            {hitDetails.mainHitCount}
                          </span>{" "}
                          个
                          {hitDetails.matchedMainNumbers.length > 0
                            ? ` (${hitDetails.matchedMainNumbers.join(", ")})`
                            : ""}
                        </p>
                        <p>
                          特别号码 ({targetDraw.additionalNumber}):{" "}
                          {hitDetails.matchedAdditionalNumberDetails.matched ? (
                            <span className="font-semibold text-yellow-600">
                              命中
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              未命中
                            </span>
                          )}
                        </p>
                        <p>
                          正码命中率 (对比官方正码数量):{" "}
                          <span className="font-semibold">
                            {hitRate.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              无历史数据可供分析。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
