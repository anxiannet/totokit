"use client";

import { MOCK_LATEST_RESULT, type HistoricalResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Award } from "lucide-react";
import { format } from "date-fns";

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

export function LatestOfficialResults() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Latest Official Results
        </CardTitle>
        <CardDescription>
          The most recent TOTO draw results. (Currently using mock data)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>Draw Date: {format(new Date(latestResult.date), "PPP")}</span>
          </div>
          <Badge variant="outline">Draw No: {latestResult.drawNumber}</Badge>
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
          Note: This component displays mock data. In a real application, it would fetch live results.
        </p>
      </CardContent>
    </Card>
  );
}
