
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ListChecks, ExternalLink, Info, Award, CheckCircle, XCircle } from "lucide-react";
import type { HitDetails, TotoCombination } from "@/lib/types";
import { NumberPickingToolDisplay } from "./NumberPickingToolDisplay";
import { MOCK_LATEST_RESULT } from '@/lib/types'; // To highlight numbers correctly

export interface LastDrawToolPerformanceInfo {
  id: string;
  name: string;
  predictionForLastDraw: TotoCombination;
  hitRateForLastDraw: number;
  hitDetailsForLastDraw: HitDetails;
}

interface LastDrawTopToolsProps {
  tools: LastDrawToolPerformanceInfo[];
  latestDrawNumber?: number;
}

export function LastDrawTopTools({ tools, latestDrawNumber }: LastDrawTopToolsProps) {
  if (!tools || tools.length === 0) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Award className="h-6 w-6 text-amber-500" />
            上期优秀工具 (第 {latestDrawNumber || "N/A"} 期)
          </CardTitle>
          <CardDescription>
            根据最新一期开奖结果计算的工具表现。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <Info className="mx-auto h-10 w-10 mb-3" />
          <p>暂无上期优秀工具数据或正在计算中。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Award className="h-6 w-6 text-amber-500" />
          上期优秀工具 (第 {latestDrawNumber || "N/A"} 期)
        </CardTitle>
        <CardDescription>
          根据最新一期开奖结果计算的工具表现，按命中率从高到低排列。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tools.map((tool) => (
          <div key={tool.id} className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
              <h3 className="text-md font-semibold text-primary">{tool.name}</h3>
              <Badge variant={tool.hitRateForLastDraw > 0 ? "default" : "secondary"} className="bg-green-600 hover:bg-green-700 text-white">
                {tool.hitRateForLastDraw > 0 ? <CheckCircle className="mr-1.5 h-4 w-4" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                上期命中率: {tool.hitRateForLastDraw.toFixed(1)}%
              </Badge>
            </div>
            <div className="mb-2">
              <p className="text-xs text-muted-foreground mb-1">
                针对上期 (第 {latestDrawNumber || "N/A"} 期) 预测号码 ({tool.predictionForLastDraw.length} 个):
              </p>
              <NumberPickingToolDisplay
                numbers={tool.predictionForLastDraw}
                historicalResultForHighlight={MOCK_LATEST_RESULT} // Highlight against the actual latest result
              />
            </div>
             {tool.hitDetailsForLastDraw && (
              <div className="text-xs space-y-0.5 text-foreground/90 mt-1">
                <p>
                  命中正码:{" "}
                  <span className="font-semibold">
                    {tool.hitDetailsForLastDraw.mainHitCount}
                  </span>{" "}
                  个
                  {tool.hitDetailsForLastDraw.matchedMainNumbers.length > 0
                    ? ` (${tool.hitDetailsForLastDraw.matchedMainNumbers.join(", ")})`
                    : ""}
                </p>
                <p>
                  特别号码 ({MOCK_LATEST_RESULT?.additionalNumber}):{" "}
                  {tool.hitDetailsForLastDraw.matchedAdditionalNumberDetails?.matched ? (
                    <span className="font-semibold text-yellow-600">命中</span>
                  ) : (
                    <span className="text-muted-foreground">未命中</span>
                  )}
                </p>
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="w-full mt-3 text-xs sm:text-sm">
              <Link href={`/number-picking-tools/${tool.id}`}>
                查看工具详细分析
                <ExternalLink className="ml-1.5 h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
