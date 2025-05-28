
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Wand2, Target, Star, Loader2 } from "lucide-react";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { useAuth } from "@/hooks/useAuth";
import { useUserFavorites } from "@/hooks/useUserFavorites";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getPredictionsForDraw, getCurrentDrawDisplayInfo } from "@/lib/actions"; // Added getCurrentDrawDisplayInfo
import { useEffect, useState } from "react"; // Added useEffect, useState

// Helper function to chunk an array
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  if (!array || array.length === 0) return result;
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export default function NumberPickingToolsListPage() {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite, isTogglingFavorite } = useUserFavorites();
  
  const [officialDrawId, setOfficialDrawId] = useState<string | null>(null);
  const [isLoadingDrawId, setIsLoadingDrawId] = useState(true);

  useEffect(() => {
    const fetchDrawId = async () => {
      setIsLoadingDrawId(true);
      const settings = await getCurrentDrawDisplayInfo();
      setOfficialDrawId(settings?.officialPredictionsDrawId || "4082"); // Fallback
      setIsLoadingDrawId(false);
    };
    fetchDrawId();
  }, []);

  const { data: predictionsForTargetDrawMap = {}, isLoading: isLoadingPredictions } = useQuery<Record<string, number[]>, Error>({
    queryKey: ["predictionsForDrawListPage", officialDrawId],
    queryFn: () => {
      if (!officialDrawId) return Promise.resolve({}); // Don't fetch if no drawId
      return getPredictionsForDraw(officialDrawId);
    },
    enabled: !!officialDrawId, // Only run query if officialDrawId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


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
          {isLoadingDrawId ? (
            <CardDescription>正在加载当前预测期号...</CardDescription>
          ) : (
            <CardDescription>
              探索多种选号策略。下方卡片直接展示各工具为第 {officialDrawId || "N/A"} 期生成的预测号码 (由管理员保存)。点击“查看详情与历史表现”可深入分析。
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {(isLoadingPredictions || isLoadingDrawId) && (
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">正在加载第 {officialDrawId || "..."} 期预测号码...</p>
            </div>
          )}
          {!isLoadingPredictions && !isLoadingDrawId && officialDrawId && dynamicTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicTools.map((tool) => {
                const currentToolId = tool.id;
                const currentPrediction = predictionsForTargetDrawMap[currentToolId] || [];
                const isCurrentlyFavorited = isFavorited(currentToolId);

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
                            onClick={() => toggleFavorite(currentToolId, tool.name)}
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
                          第 {officialDrawId} 期预测 ({currentPrediction.length} 个):
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
                          <p className="text-xs text-muted-foreground italic">此工具对第 {officialDrawId} 期的预测尚未生成。</p>
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
             !isLoadingPredictions && !isLoadingDrawId && <p className="text-muted-foreground text-center py-8">暂无可用选号工具或未能加载预测期号。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
