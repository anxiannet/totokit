
"use client";

import { MOCK_LATEST_RESULT, type HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Award } from "lucide-react";
import { getBallColor, formatDateToLocale } from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";

// This would ideally fetch real data or allow user input
const latestResult: HistoricalResult = MOCK_LATEST_RESULT;

export function LatestOfficialResults() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          最新官方结果
        </CardTitle>
        <CardDescription>
          最新的TOTO开奖结果。(目前使用模拟数据)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>开奖日期: {formatDateToLocale(latestResult.date, zhCN)}</span>
          </div>
          <Badge variant="outline">期号: {latestResult.drawNumber}</Badge>
        </div>
        <div className="flex flex-col items-center space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
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
          <span className="text-2xl font-light text-muted-foreground mx-1 sm:mx-2">+</span>
          <span
            key={`additional-${latestResult.additionalNumber}`}
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold shadow-md ${getBallColor(latestResult.additionalNumber, true)}`}
          >
            {latestResult.additionalNumber}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2">
          注意：此组件显示模拟数据。在实际应用中，它将获取实时结果。
        </p>
      </CardContent>
    </Card>
  );
}
