"use client";

import { MOCK_LATEST_RESULT, type HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Award } from "lucide-react";
import { format, Locale } from "date-fns";
import { zhCN } from "date-fns/locale"; // Import Chinese locale for date-fns

// This would ideally fetch real data or allow user input
const latestResult: HistoricalResult = MOCK_LATEST_RESULT;

const getBallColor = (number: number, isAdditional: boolean = false): string => {
  if (isAdditional) return "bg-destructive"; // Crimson Red for additional number
  if (number >= 1 && number <= 9) return "bg-red-500";
  if (number >= 10 && number <= 19) return "bg-blue-500";
  if (number >= 20 && number <= 29) return "bg-green-500";
  if (number >= 30 && number <= 39) return "bg-yellow-500 text-black";
  if (number >= 40 && number <= 49) return "bg-purple-500";
  return "bg-gray-500";
};

// Simplified date formatting for Chinese. For full i18n, use a more robust solution.
const formatDate = (dateString: string, locale: Locale = zhCN) => {
  try {
    return format(new Date(dateString), "PPP", { locale });
  } catch (e) {
    return dateString; // Fallback
  }
};

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
            <span>开奖日期: {formatDate(latestResult.date)}</span>
          </div>
          <Badge variant="outline">期号: {latestResult.drawNumber}</Badge>
        </div>
        <div className="flex flex-col items-center space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
          <div className="flex space-x-1.5">
            {latestResult.numbers.map((num) => (
              <span
                key={`main-${num}`}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold text-white shadow-md ${getBallColor(num)}`}
              >
                {num}
              </span>
            ))}
          </div>
          <span className="text-2xl font-light text-muted-foreground mx-1 sm:mx-2">+</span>
          <span
            key={`additional-${latestResult.additionalNumber}`}
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold text-white shadow-md ${getBallColor(latestResult.additionalNumber, true)}`}
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
