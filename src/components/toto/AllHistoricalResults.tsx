
"use client";

import type { HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ListOrdered, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { getBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { zhCN } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getHistoricalResultsFromFirestore } from "@/services/totoResultsService";
import { MOCK_HISTORICAL_DATA } from "@/lib/types"; // Import MOCK_HISTORICAL_DATA as fallback

export function AllHistoricalResults() {
  const { data: results, isLoading, isError, error } = useQuery<HistoricalResult[], Error>({
    queryKey: ["historicalTotoResults"],
    queryFn: getHistoricalResultsFromFirestore,
    // Fallback to mock data is handled within getHistoricalResultsFromFirestore
    // initialData: MOCK_HISTORICAL_DATA, // Or provide mock data as initial
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            全部开奖结果
          </CardTitle>
          {/* Back button already handled by historical-results/page.tsx */}
        </div>
        <CardDescription>
          过往TOTO开奖结果列表。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-60">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">正在加载历史结果...</p>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center h-60 text-destructive">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p className="font-semibold">加载历史结果失败</p>
            <p className="text-sm">{error?.message || "未知错误"}</p>
            <p className="text-xs mt-2">将显示模拟数据作为备用。</p>
          </div>
        )}
        {/* Always render the results area, it will use fetched data or fallback mock data */}
        {results && results.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-250px)] rounded-md border">
            <div className="p-4 space-y-6">
              {results.map((result) => (
                <div key={result.drawNumber} className="p-4 rounded-lg shadow-sm border bg-card">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>开奖日期: {formatDateToLocale(result.date, zhCN)}</span>
                    </div>
                    <Badge variant="secondary">期号: {result.drawNumber}</Badge>
                  </div>
                  <div className="flex flex-col items-center space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
                    <div className="flex space-x-1.5">
                      {result.numbers.map((num) => (
                        <span
                          key={`main-${result.drawNumber}-${num}`}
                          className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold shadow-md ${getBallColor(num)}`}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                    <span className="text-xl font-light text-muted-foreground mx-1 sm:mx-2">+</span>
                    <span
                      key={`additional-${result.drawNumber}-${result.additionalNumber}`}
                      className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold shadow-md ${getBallColor(result.additionalNumber, true)}`}
                    >
                      {result.additionalNumber}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          !isLoading && <p className="text-muted-foreground text-center">没有历史数据可显示。</p>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          {results ? `共显示 ${results.length} 期历史结果。` : "正在统计结果数量..."}
          {(isLoading || (results && results === MOCK_HISTORICAL_DATA)) && !isError && <span className="text-xs"> (部分数据可能来自模拟)</span>}
        </p>
      </CardFooter>
    </Card>
  );
}
