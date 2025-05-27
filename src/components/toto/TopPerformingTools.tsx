
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Percent, ListChecks, ExternalLink } from "lucide-react";
import type { NumberPickingTool as DynamicNumberPickingTool } from "@/lib/numberPickingAlgos";
import { NumberPickingToolDisplay } from "./NumberPickingToolDisplay";
import type { TotoCombination } from '@/lib/types';

export interface TopToolDisplayInfo extends DynamicNumberPickingTool {
  averageHitRate: number;
  currentPrediction: TotoCombination;
}

interface TopPerformingToolsProps {
  tools: TopToolDisplayInfo[];
}

export function TopPerformingTools({ tools }: TopPerformingToolsProps) {
  if (!tools || tools.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            近期热门工具
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">暂无热门工具数据。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <TrendingUp className="h-6 w-6 text-primary" />
          近期热门工具
        </CardTitle>
        <CardDescription>
          根据最近10期历史开奖结果分析，表现最佳的选号工具。左右滑动查看更多。
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0"> {/* Adjusted padding for scroll container */}
        <div className="flex overflow-x-auto space-x-4 p-4 no-scrollbar snap-x snap-mandatory">
          {tools.map((tool) => (
            <Card key={tool.id} className="flex-shrink-0 w-[300px] md:w-[340px] snap-start flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    {tool.averageHitRate.toFixed(1)}% 命中率
                  </Badge>
                </div>
                <CardDescription className="text-xs pt-1 h-10 line-clamp-2">{tool.description}</CardDescription> {/* Added fixed height for description */}
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1 text-muted-foreground flex items-center gap-1">
                    <ListChecks className="h-4 w-4"/>
                    当前预测 ({tool.currentPrediction.length} 个):
                  </h4>
                  {tool.currentPrediction.length > 0 ? (
                    <NumberPickingToolDisplay numbers={tool.currentPrediction} />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">此工具当前未生成号码</p>
                  )}
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                   <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/number-picking-tools#${tool.id}`}>
                          查看详细分析
                          <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                   </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
