
"use client";

import type { HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Award } from "lucide-react";
import { getBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import { MOCK_LATEST_RESULT } from "@/lib/types";

export function LatestOfficialResults() {
  const latestResult: HistoricalResult | null = MOCK_LATEST_RESULT;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          最新官方结果
        </CardTitle>
        <CardDescription>
          最新的TOTO开奖结果（使用模拟数据）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestResult ? (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>开奖日期: {formatDateToLocale(latestResult.date, zhCN)}</span>
              </div>
              <Badge variant="outline">期号: {latestResult.drawNumber}</Badge>
            </div>
            <div className="flex flex-row items-center justify-center flex-nowrap">
              {latestResult.numbers.map((num) => (
                <span
                  key={`main-${num}`}
                  className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-base sm:text-lg font-bold shadow-md ${getBallColor(num)} mx-0.5 sm:mx-1`}
                >
                  {num}
                </span>
              ))}
              <span className="text-2xl font-light text-muted-foreground mx-1 sm:mx-2">+</span>
              <span
                key={`additional-${latestResult.additionalNumber}`}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-base sm:text-lg font-bold shadow-md ${getBallColor(latestResult.additionalNumber, true)} mx-0.5 sm:mx-1`}
              >
                {latestResult.additionalNumber}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
             数据来源：模拟数据
            </p>
          </>
        ) : (
            <p className="text-muted-foreground text-center h-40 flex items-center justify-center">
                未能加载最新结果。
            </p>
        )}
      </CardContent>
    </Card>
  );
}
