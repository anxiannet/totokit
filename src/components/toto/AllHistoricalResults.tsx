
"use client";

import type { HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ListOrdered, AlertTriangle, Loader2 } from "lucide-react";
import { getBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { zhCN } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getAllHistoricalResultsFromFirestore } from "@/lib/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AllHistoricalResults() {
  const { 
    data: results, 
    isLoading, 
    error 
  } = useQuery<HistoricalResult[], Error>({
    queryKey: ["allHistoricalResults"],
    queryFn: getAllHistoricalResultsFromFirestore,
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            全部开奖结果
          </CardTitle>
          <CardDescription>
            正在从数据库加载开奖结果...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-60">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            全部开奖结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              加载开奖结果失败：{error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            全部开奖结果
          </CardTitle>
        </div>
        <CardDescription>
          过往TOTO开奖结果列表（来自数据库）。
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  <div className="flex flex-row items-center justify-center flex-nowrap">
                    {result.numbers.map((num) => (
                      <span
                        key={`main-${result.drawNumber}-${num}`}
                        className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-sm sm:text-base font-bold shadow-md ${getBallColor(num)} mx-0.5`}
                      >
                        {num}
                      </span>
                    ))}
                    <span className="text-xl font-light text-muted-foreground mx-1 sm:mx-2">+</span>
                    <span
                      key={`additional-${result.drawNumber}-${result.additionalNumber}`}
                      className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-sm sm:text-base font-bold shadow-md ${getBallColor(result.additionalNumber, true)} mx-0.5`}
                    >
                      {result.additionalNumber}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-10">数据库中没有历史数据可显示。</p>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          {results ? `共显示 ${results.length} 期历史结果 (来自数据库)。` : "正在统计结果数量..."}
        </p>
      </CardFooter>
    </Card>
  );
}
