
"use client";

import type { HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Award, Loader2, AlertTriangle } from "lucide-react";
import { getBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getLatestHistoricalResultFromFirestore } from "@/services/totoResultsService";
import { MOCK_LATEST_RESULT } from "@/lib/types"; // Import fallback

export function LatestOfficialResults() {
  const { data: latestResult, isLoading, isError, error } = useQuery<HistoricalResult, Error>({
    queryKey: ["latestTotoResult"],
    queryFn: getLatestHistoricalResultFromFirestore,
    // Fallback to mock data is handled within getLatestHistoricalResultFromFirestore
    // initialData: MOCK_LATEST_RESULT,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          最新官方结果
        </CardTitle>
        <CardDescription>
          最新的TOTO开奖结果。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">正在加载最新结果...</p>
          </div>
        )}
        {isError && latestResult === MOCK_LATEST_RESULT && ( // Show error only if fallback is also active
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p className="font-semibold">加载最新结果失败</p>
            <p className="text-sm">{error?.message || "未知错误"}</p>
            <p className="text-xs mt-2">将显示模拟数据作为备用。</p>
          </div>
        )}
        {latestResult && (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>开奖日期: {formatDateToLocale(latestResult.date, zhCN)}</span>
              </div>
              <Badge variant="outline">期号: {latestResult.drawNumber}</Badge>
            </div>
            <div className="flex flex-row items-center justify-center flex-nowrap">
              <div className="flex space-x-1.5">
                {latestResult.numbers.map((num) => (
                  <span
                    key={`main-${num}`}
                    className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold shadow-md ${getBallColor(num)}`}
                  >
                    {num}
                  </span>
                ))}
              </div>
              <span className="text-2xl font-light text-muted-foreground mx-2">+</span>
              <span
                key={`additional-${latestResult.additionalNumber}`}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold shadow-md ${getBallColor(latestResult.additionalNumber, true)}`}
              >
                {latestResult.additionalNumber}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
             { (isLoading || latestResult === MOCK_LATEST_RESULT) && !isError && " (部分数据可能来自模拟)"}
             { !isLoading && latestResult !== MOCK_LATEST_RESULT && "数据来源：Firestore"}
            </p>
          </>
        )}
        {!latestResult && !isLoading && !isError && (
            <p className="text-muted-foreground text-center h-40 flex items-center justify-center">
                未能加载最新结果。
            </p>
        )}
      </CardContent>
    </Card>
  );
}
