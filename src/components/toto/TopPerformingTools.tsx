
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, ExternalLink, Info, Loader2, Target, Percent } from "lucide-react";
import type { NumberPickingTool as DynamicNumberPickingTool } from "@/lib/numberPickingAlgos";
import { NumberPickingToolDisplay } from "./NumberPickingToolDisplay";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getPredictionsForDraw } from '@/lib/actions';
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types"; // Import from new location

export interface TopToolDisplayInfo extends DynamicNumberPickingTool {
  averageHitRate: number;
}

interface TopPerformingToolsProps {
  tools: TopToolDisplayInfo[];
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  if (!array || array.length === 0) return result;
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function TopPerformingTools({ tools }: TopPerformingToolsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const { data: predictionsForTargetDrawMap = {}, isLoading: isLoadingPredictions } = useQuery<Record<string, number[]>, Error>({
    queryKey: ["predictionsForDrawHomepage", OFFICIAL_PREDICTIONS_DRAW_ID],
    queryFn: () => getPredictionsForDraw(OFFICIAL_PREDICTIONS_DRAW_ID),
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
      setTimeout(() => setIsInteracting(false), 600); // Animation duration
    }
  }, []);

  useEffect(() => {
    scrollToTool(activeIndex);
  }, [activeIndex, scrollToTool]);

  useEffect(() => {
    if (isInteracting || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isInteracting) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) { // Increased threshold
            const index = itemRefs.current.findIndex(ref => ref === entry.target);
            if (index !== -1 && activeIndex !== index) {
               setActiveIndex(index);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.75, // Monitor when 75% of the item is visible
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
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-8 min-h-[200px]">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">暂无热门工具数据或正在加载...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Info className="h-6 w-6 text-primary" />
          近期热门工具
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-0 sm:px-0 md:px-0">
        <Tabs
          value={tools[activeIndex]?.id || (tools[0] ? tools[0].id : '')}
          onValueChange={(value) => {
            const newIndex = tools.findIndex(tool => tool.id === value);
            if (newIndex !== -1) {
              setActiveIndex(newIndex);
            }
          }}
          className="w-full"
        >
          <TabsList className="flex overflow-x-auto whitespace-nowrap no-scrollbar mb-4 h-auto p-1 mx-2 sm:mx-4 rounded-lg bg-muted">
            {tools.map((tool, index) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className={cn(
                    "text-xs sm:text-sm px-3 py-1.5 h-auto flex-shrink-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm",
                    activeIndex === index ? "font-semibold" : ""
                )}
                onClick={() => setActiveIndex(index)}
              >
                {tool.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
          >
            {tools.map((tool, index) => {
              const currentPredictionForDraw = predictionsForTargetDrawMap[tool.id] || [];
              return (
                <div
                  key={tool.id}
                  ref={el => itemRefs.current[index] = el}
                  className="min-w-full snap-start flex-shrink-0 px-4" // Added px-4 here for spacing around cards
                >
                  <div className="border p-4 rounded-lg bg-card shadow-sm min-h-[150px] flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                          <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Target className="mr-1 h-4 w-4 text-primary/80" />
                            第 {OFFICIAL_PREDICTIONS_DRAW_ID} 期预测 ({currentPredictionForDraw.length} 个):
                          </h5>
                          <Badge variant="secondary" className="text-xs sm:text-sm">
                           平均命中率：{tool.averageHitRate.toFixed(1)}%
                          </Badge>
                      </div>

                      {isLoadingPredictions ? (
                        <div className="flex items-center space-x-2 mb-3">
                          <Loader2 className="h-5 w-5 animate-spin" />
                           <p className="text-xs text-muted-foreground italic">加载预测中...</p>
                        </div>
                      ) : currentPredictionForDraw.length > 0 ? (
                          <div className="mb-3">
                           {chunkArray(currentPredictionForDraw, 7).map((chunk, chunkIndex) => (
                             <div key={chunkIndex} className={cn("flex justify-center", chunkIndex > 0 ? "mt-1.5" : "")}>
                               <NumberPickingToolDisplay numbers={chunk} />
                             </div>
                           ))}
                          </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mb-3">此工具对第 {OFFICIAL_PREDICTIONS_DRAW_ID} 期的预测尚未生成。</p>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full mt-auto text-xs sm:text-sm">
                        <Link href={`/number-picking-tools/${tool.id}`}>
                            查看详细分析与历史表现
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" />
                        </Link>
                     </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
