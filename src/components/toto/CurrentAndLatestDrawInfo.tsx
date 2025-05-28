
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, ArrowRight, Loader2 } from "lucide-react";
import { MOCK_LATEST_RESULT, type HistoricalResult } from "@/lib/types";
import { formatDateToLocale, getBallColor } from "@/lib/totoUtils";
import { Separator } from "@/components/ui/separator";
import { zhCN } from "date-fns/locale";
// Removed: import { getCurrentDrawDisplayInfo } from "@/lib/actions"; // No longer fetching from Firestore

export function CurrentAndLatestDrawInfo() {
  const latestResult: HistoricalResult | null = MOCK_LATEST_RESULT;

  // Default values are already in Chinese descriptive format
  const [currentDrawDateTime, setCurrentDrawDateTime] = useState("周四, 2025年5月29日, 傍晚6点30分");
  const [currentJackpot, setCurrentJackpot] = useState("$4,500,000 (估计)");
  const [isLoadingDrawInfo, setIsLoadingDrawInfo] = useState(false); // Set to false as we are not fetching

  // useEffect to fetch from Firestore is removed as per previous changes.
  // If this needs to be re-enabled, the fetching logic would go here.

  return (
    <Card className="w-full mb-6 shadow-lg border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" />
          本期开奖信息
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
       {isLoadingDrawInfo ? (
          <div className="flex items-center justify-center p-4 bg-secondary/30 rounded-lg min-h-[90px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-4 bg-secondary/30 rounded-lg space-y-1 min-h-[90px]">
            <p className="text-sm text-muted-foreground">{currentDrawDateTime}</p>
            <p className="text-sm text-muted-foreground mt-2">当前头奖预估</p>
            <p className="text-2xl font-bold text-primary">{currentJackpot}</p>
          </div>
        )}
      </CardContent>

      <Separator className="my-0 bg-border/50" />

      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-amber-500" />
            最新开奖结果
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/historical-results">
              更多结果 <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {latestResult && (
          <CardDescription>
            {formatDateToLocale(latestResult.date, zhCN)} - 第 {latestResult.drawNumber} 期
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {latestResult ? (
          <div className="space-y-3">
            <div className="flex flex-row items-center justify-center flex-nowrap space-x-1 sm:space-x-1.5">
              {latestResult.numbers.map((num) => (
                <span
                  key={`main-${latestResult.drawNumber}-${num}`}
                  className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-base sm:text-lg font-bold shadow-md ${getBallColor(num)}`}
                >
                  {num}
                </span>
              ))}
              <span className="text-2xl font-light text-muted-foreground mx-1 sm:mx-2">+</span>
              <span
                key={`additional-${latestResult.drawNumber}-${latestResult.additionalNumber}`}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-base sm:text-lg font-bold shadow-md ${getBallColor(latestResult.additionalNumber, true)}`}
              >
                {latestResult.additionalNumber}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">未能加载最新结果。</p>
        )}
      </CardContent>
    </Card>
  );
}
