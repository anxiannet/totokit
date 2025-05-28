
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Award, CheckCircle, XCircle, ArrowRight } from "lucide-react"; // Added ArrowRight
import type { HitDetails, TotoCombination } from "@/lib/types";
import { NumberPickingToolDisplay } from "./NumberPickingToolDisplay";
import { MOCK_LATEST_RESULT } from '@/lib/types';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

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

// Helper function to chunk an array
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  if (!array || array.length === 0) return result;
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function LastDrawTopTools({ tools, latestDrawNumber }: LastDrawTopToolsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const latestActualDraw = MOCK_LATEST_RESULT;

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
    <Card className="mt-6 shadow-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Award className="h-6 w-6 text-amber-500" />
          上期优秀工具 (第 {latestDrawNumber || "N/A"} 期)
        </CardTitle>
        <CardDescription>
          根据最新一期开奖结果计算的工具表现，按命中率从高到低排列。左右滑动查看。
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-0">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar h-[230px]" // Added fixed height
        >
          {tools.map((tool, index) => (
            <div
              key={tool.id}
              ref={el => itemRefs.current[index] = el}
              className="min-w-full snap-start flex-shrink-0 px-4 py-2 h-full" // Added h-full
            >
              <Link href={`/number-picking-tools/${tool.id}`} className="block h-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
                <div className="p-4 border rounded-lg bg-card shadow-sm h-full flex flex-col justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                  <div>
                    <div className="flex flex-row justify-between items-center mb-2 gap-2">
                      <h3 className="text-md font-semibold text-primary truncate">{tool.name}</h3>
                      <Badge variant={tool.hitRateForLastDraw > 0 ? "default" : "secondary"} className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap flex-shrink-0">
                        {tool.hitRateForLastDraw > 0 ? <CheckCircle className="mr-1.5 h-4 w-4" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                        上期命中率: {tool.hitRateForLastDraw.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mb-2">
                      {chunkArray(tool.predictionForLastDraw, 9).map((chunk, chunkIndex) => (
                        <div key={chunkIndex} className={cn("flex justify-center", chunkIndex > 0 ? "mt-1.5" : "")}>
                          <NumberPickingToolDisplay
                            numbers={chunk}
                            historicalResultForHighlight={latestActualDraw}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                   <div className="mt-auto text-center text-xs text-primary/80 flex items-center justify-center pt-2">
                      详细分析 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </div>
                </div>
              </Link>
            </div>
          ))}
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
