
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, ListChecks, ExternalLink } from "lucide-react";
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
      </CardHeader>
      <CardContent>
        {tools.length > 0 ? (
          <Tabs defaultValue={tools[0].id} className="w-full">
            <TabsList className="flex overflow-x-auto whitespace-nowrap no-scrollbar mb-4 h-auto p-1">
              {tools.map((tool) => (
                <TabsTrigger
                  key={tool.id}
                  value={tool.id}
                  className="text-xs sm:text-sm px-3 py-1.5 h-auto flex-shrink-0"
                >
                  {tool.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {tools.map((tool) => (
              <TabsContent key={tool.id} value={tool.id} className="mt-2">
                <div className="border p-4 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold">{tool.name}</h4>
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs sm:text-sm">
                      命中率：{tool.averageHitRate.toFixed(1)}%
                    </Badge>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-1 text-muted-foreground flex items-center gap-1">
                      <ListChecks className="h-4 w-4"/>
                      当前预测 ({tool.currentPrediction.length} 个):
                    </h5>
                    {tool.currentPrediction.length > 0 ? (
                      <NumberPickingToolDisplay numbers={tool.currentPrediction} />
                    ) : (
                      <p className="text-xs text-muted-foreground italic">此工具当前未生成号码</p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full mt-4 text-xs sm:text-sm">
                      <Link href={`/number-picking-tools#${tool.id}`}>
                          查看详细分析
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" />
                      </Link>
                   </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p className="text-muted-foreground text-center py-4">正在加载工具信息...</p>
        )}
      </CardContent>
    </Card>
  );
}
