
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, DollarSign, Trophy, ArrowRight } from "lucide-react";
import { MOCK_LATEST_RESULT, type HistoricalResult } from "@/lib/types";
import { formatDateToLocale, getBallColor } from "@/lib/totoUtils";
import { Separator } from "@/components/ui/separator";

export function CurrentAndLatestDrawInfo() {
  const latestResult: HistoricalResult | null = MOCK_LATEST_RESULT;

  // Hardcoded current draw info as per request
  const currentDrawDateTime = "周一, 2025年5月26日, 傍晚6点30分";
  const currentJackpot = "$2,500,000 (估计)";

  return (
    <Card className="w-full mb-6 shadow-lg border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" />
          本期开奖信息
        </CardTitle>
        <CardDescription>
          {currentDrawDateTime}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">当前头奖预估</p>
            <p className="text-2xl font-bold text-primary">{currentJackpot}</p>
          </div>
          <DollarSign className="h-10 w-10 text-green-600" />
        </div>
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
            {formatDateToLocale(latestResult.date)} - 第 {latestResult.drawNumber} 期
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
