
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, ArrowRight, Loader2 } from "lucide-react";
import { MOCK_LATEST_RESULT, type HistoricalResult } from "@/lib/types";
import { formatDateTimeToChinese, formatDateToLocale, getBallColor } from "@/lib/totoUtils"; // Updated import
import { Separator } from "@/components/ui/separator";
import { zhCN } from "date-fns/locale";
import { getCurrentDrawDisplayInfo } from "@/lib/actions";

export function CurrentAndLatestDrawInfo() {
  const latestResult: HistoricalResult | null = MOCK_LATEST_RESULT;

  // Default to Chinese format for initial state and fallback
  const [currentDrawDateTime, setCurrentDrawDateTime] = useState("周四, 2025年5月29日, 傍晚6点30分");
  const [currentJackpot, setCurrentJackpot] = useState("$4,500,000");
  const [isLoadingDrawInfo, setIsLoadingDrawInfo] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      setIsLoadingDrawInfo(true);
      try {
        const info = await getCurrentDrawDisplayInfo();
        if (info && info.currentDrawDateTime && info.currentJackpot) {
          // Attempt to format the fetched date/time string to Chinese if it matches specific English pattern
          const formattedDateTime = formatDateTimeToChinese(info.currentDrawDateTime);
          setCurrentDrawDateTime(formattedDateTime);
          setCurrentJackpot(info.currentJackpot);
        } else {
          console.warn("Current draw info not found in Firestore, using default display values.");
          // Default values are already set in useState
        }
      } catch (error) {
        console.error("Error fetching current draw info for display:", error);
        // Fallback to default values (already set in useState)
      } finally {
        setIsLoadingDrawInfo(false);
      }
    };
    fetchInfo();
  }, []);


  return (
    <Card className="w-full mb-6 shadow-lg border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" />
          本期开奖信息
        </CardTitle>
        {isLoadingDrawInfo ? (
           <div className="flex items-center space-x-2 mt-1">
             <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
             <p className="text-sm text-muted-foreground">加载开奖时间...</p>
           </div>
        ) : (
          // Display the (potentially formatted) currentDrawDateTime
          <p className="text-sm text-muted-foreground pt-1">{currentDrawDateTime}</p>
        )}
      </CardHeader>
      <CardContent className="py-2">
       {isLoadingDrawInfo ? (
          <div className="flex items-center justify-center p-4 bg-secondary/30 rounded-lg min-h-[70px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">加载头奖金额...</p>
          </div>
        ) : (
          <div className="p-4 bg-secondary/30 rounded-lg space-y-1 min-h-[70px]">
            <p className="text-sm text-muted-foreground">当前头奖预估</p>
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
