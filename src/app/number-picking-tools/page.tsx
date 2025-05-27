
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Wand2, Target, Star, Loader2 } from "lucide-react";
import { dynamicTools, type NumberPickingTool } from "@/lib/numberPickingAlgos";
import { MOCK_HISTORICAL_DATA, type HistoricalResult, type TotoCombination } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { useAuth } from "@/hooks/useAuth";
import { useUserFavorites } from "@/hooks/useUserFavorites";
import { cn } from "@/lib/utils";

// Helper function to chunk an array - keep if still used, otherwise remove.
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  if (!array) return result;
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}


export default function NumberPickingToolsListPage() {
  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;
  const absoluteLatestTenDraws: HistoricalResult[] = allHistoricalData.slice(0, 10);

  const { user } = useAuth();
  const { isFavorited, toggleFavorite, isTogglingFavorite } = useUserFavorites();

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
            探索多种选号工具。下方卡片直接展示各工具基于最新10期历史数据生成的当期预测号码。点击“查看详情与历史表现”可深入分析其在过去10期开奖中的动态预测情况。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dynamicTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicTools.map((tool) => {
                const currentPrediction = tool.algorithmFn(absoluteLatestTenDraws);
                const isCurrentlyFavorited = isFavorited(tool.id);
                
                return (
                  <Card key={tool.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-200">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                        {user && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleFavorite(tool.id, tool.name)}
                            disabled={isTogglingFavorite}
                            aria-label={isCurrentlyFavorited ? "取消收藏" : "收藏"}
                          >
                            {isTogglingFavorite && <Loader2 className="h-4 w-4 animate-spin" />}
                            {!isTogglingFavorite && (
                              <Star
                                className={cn(
                                  "h-5 w-5",
                                  isCurrentlyFavorited
                                    ? "fill-yellow-400 text-yellow-500"
                                    : "text-muted-foreground"
                                )}
                              />
                            )}
                          </Button>
                        )}
                      </div>
                      <CardDescription className="text-sm text-muted-foreground h-20 overflow-auto no-scrollbar">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                          <Target className="mr-1.5 h-4 w-4 text-primary/80" />
                          当期预测 ({currentPrediction.length} 个):
                        </p>
                        {currentPrediction.length > 0 ? (
                          <div className="max-h-20 overflow-y-auto no-scrollbar rounded-md border p-2 bg-muted/30">
                            {chunkArray(currentPrediction, 6).map((chunk, chunkIndex) => (
                              <div key={chunkIndex} className={chunkIndex > 0 ? "mt-1" : ""}>
                                <NumberPickingToolDisplay numbers={chunk} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">此工具当前未生成号码。</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href={`/number-picking-tools/${tool.id}`}>
                          查看详情与历史表现
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
             <p className="text-muted-foreground text-center py-8">暂无可用选号工具。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
