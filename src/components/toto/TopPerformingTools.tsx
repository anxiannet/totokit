
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Target, Loader2, Percent, Sparkles, ArrowRight } from "lucide-react";
import type { DynamicNumberPickingTool } from "@/lib/numberPickingAlgos";
import { NumberPickingToolDisplay } from "./NumberPickingToolDisplay";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getPredictionsForDraw } from '@/lib/actions';
// import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types"; // Will get from prop
import { getTotoSystemBetPrice } from '@/lib/totoUtils';
import { Button } from "@/components/ui/button";


export interface TopToolDisplayInfo extends Omit<DynamicNumberPickingTool, 'algorithmFn'> {
  averageHitRate: number;
  // currentPredictionForDraw is now fetched via officialDrawId
}

interface TopPerformingToolsProps {
  tools: TopToolDisplayInfo[];
  officialDrawId: string | null; // New prop
}

// Helper function to chunk an array
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  if (!array || array.length === 0) return result;
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function TopPerformingTools({ tools, officialDrawId }: TopPerformingToolsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const { data: officialPredictionsMap = {}, isLoading: isLoadingPredictions } = useQuery<Record<string, number[]>, Error>({
    queryKey: ["allOfficialPredictionsForHomepageTopTools", officialDrawId],
    queryFn: () => {
      if (!officialDrawId) return Promise.resolve({});
      return getPredictionsForDraw(officialDrawId);
    },
    enabled: !!officialDrawId,
    staleTime: 5 * 60 * 1000, 
  });

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, tools.length);
  }, [tools.length]);

  const scrollToTool = useCallback((index: number) => {
    if (itemRefs.current[index] && scrollContainerRef.current) {
      setIsInteracting(true); 
      itemRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
      setTimeout(() => setIsInteracting(false), 600);
    }
  }, []);

  useEffect(() => {
    scrollToTool(activeIndex);
  }, [activeIndex, scrollToTool]);


  useEffect(() => {
    if (isInteracting || !scrollContainerRef.current || tools.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isInteracting) return; 

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) { 
            const index = itemRefs.current.findIndex(ref => ref === entry.target);
            if (index !== -1 && activeIndex !== index) {
               setActiveIndex(index);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.75, 
      }
    );

    itemRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      itemRefs.current.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [tools, activeIndex, isInteracting]);


  if (!tools || tools.length === 0) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Info className="h-6 w-6 text-primary" />
            近期热门工具
          </CardTitle>
           <CardDescription>根据近10期平均命中率排列。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-8 min-h-[200px]">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">暂无热门工具数据或正在加载...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Info className="h-6 w-6 text-primary" />
          近期热门工具
        </CardTitle>
        <CardDescription>根据近10期平均命中率排列。左右滑动查看。</CardDescription>
      </CardHeader>
      <CardContent className="py-4 md:py-6 px-0"> {/* Adjusted padding */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar h-[260px] md:h-[280px]" // Adjusted height
        >
          {tools.map((tool, index) => {
            const predictionNumbers = isLoadingPredictions || !officialDrawId ? [] : (officialPredictionsMap[tool.id] || []);
            const predictionCount = predictionNumbers.length;
            const betPrice = getTotoSystemBetPrice(predictionCount);

            return (
              <div
                key={tool.id}
                ref={el => itemRefs.current[index] = el}
                className="min-w-full snap-start flex-shrink-0 px-4 py-2 h-full"
              >
                <Link href={`/number-picking-tools/${tool.id}`} className="block h-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
                  <div className="p-4 border rounded-lg bg-card shadow-sm h-full flex flex-col justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="flex flex-row justify-between items-center mb-2 gap-2">
                        <h3 className="text-md font-semibold text-primary truncate flex-grow">
                          {tool.name} {officialDrawId && predictionCount > 0 ? `(${predictionCount}个)`: ""}
                        </h3>
                         <Badge variant={"secondary"} className="whitespace-nowrap flex-shrink-0">
                          平均命中率：{tool.averageHitRate.toFixed(1)}%
                        </Badge>
                      </div>
                       <div className="flex justify-between items-center mb-1.5">
                          <h5 className="text-xs font-medium text-muted-foreground flex items-center">
                            <Target className="mr-1.5 h-3.5 w-3.5 text-primary/70" />
                            第 {officialDrawId || "..."} 期预测:
                          </h5>
                       </div>

                      <div className="mb-2 min-h-[50px]"> 
                        {isLoadingPredictions && officialDrawId && (
                          <div className="flex items-center space-x-2 h-full justify-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <p className="text-xs text-muted-foreground italic">加载预测中...</p>
                          </div>
                        )}
                        {!isLoadingPredictions && officialDrawId && predictionNumbers.length > 0 && (
                          <div className="space-y-1">
                            {chunkArray(predictionNumbers, 9).map((chunk, chunkIndex) => (
                              <div key={chunkIndex} className={cn("flex justify-center")}>
                                <NumberPickingToolDisplay numbers={chunk} />
                              </div>
                            ))}
                          </div>
                        )}
                         {!isLoadingPredictions && officialDrawId && predictionNumbers.length === 0 && (
                          <p className="text-xs text-muted-foreground italic h-full flex items-center justify-center">
                            该工具对第 {officialDrawId} 期的预测尚未生成。
                          </p>
                        )}
                        {!officialDrawId && !isLoadingPredictions && (
                           <p className="text-xs text-muted-foreground italic h-full flex items-center justify-center">
                            等待预测期号加载...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-2">
                      {betPrice !== null && predictionCount > 0 && (
                        <p className="text-center text-sm font-semibold text-primary mt-1 mb-3">
                          使用智能精选算法投注 {predictionCount} 个号码仅需 {betPrice} 新币
                        </p>
                      )}
                      <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary/80">
                        查看详细分析
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        {tools.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {tools.map((_, index) => (
              <button
                key={`dot-${index}`}
                onClick={() => {
                  setIsInteracting(true); 
                  setActiveIndex(index);
                }}
                aria-label={`切换到工具 ${index + 1}`}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  activeIndex === index ? "bg-primary" : "bg-muted hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
