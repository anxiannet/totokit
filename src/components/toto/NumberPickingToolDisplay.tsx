
"use client";

import type { TotoCombination, HistoricalResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface NumberPickingToolDisplayProps {
  numbers: TotoCombination;
  historicalResultForHighlight?: HistoricalResult | null;
  defaultBallColor?: string;
  matchedMainBallColor?: string;
  matchedAdditionalBallColor?: string;
  unmatchedHistoricalBallColor?: string;
}

export function NumberPickingToolDisplay({
  numbers,
  historicalResultForHighlight = null,
  defaultBallColor = "bg-sky-600 text-white", // Default for general display of tool's numbers
  matchedMainBallColor = "bg-green-500 text-white",
  matchedAdditionalBallColor = "bg-yellow-400 text-black",
  unmatchedHistoricalBallColor = "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200", // For non-hits when comparing
}: NumberPickingToolDisplayProps) {
  if (!numbers || numbers.length === 0) {
    return <p className="text-sm text-muted-foreground mt-2">此工具当前未提供号码。</p>;
  }

  let winningMainNumbersSet = new Set<number>();
  let additionalWinningNum: number | null = null;

  if (historicalResultForHighlight) {
    winningMainNumbersSet = new Set(historicalResultForHighlight.numbers);
    additionalWinningNum = historicalResultForHighlight.additionalNumber;
  }

  const getBallStyle = (num: number): string => {
    if (historicalResultForHighlight) {
      // Check if this number from the tool's list matches the additional number of the historical draw
      if (num === additionalWinningNum) {
        return matchedAdditionalBallColor;
      }
      // Check if this number from the tool's list matches any of the main winning numbers of the historical draw
      if (winningMainNumbersSet.has(num)) {
        return matchedMainBallColor;
      }
      return unmatchedHistoricalBallColor; // Number from tool exists, but didn't match historical
    }
    return defaultBallColor; // General display, no highlighting against historical
  };

  return (
    <div className="mt-1 mb-1">
      {/* Removed w-full from the div below to allow parent to center it */}
      <div className="flex flex-wrap gap-1.5 items-center justify-start">
        {numbers.map((num, index) => (
          <Badge
            key={`${num}-${index}-${Math.random()}`}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm ${getBallStyle(num)}`}
          >
            {num}
          </Badge>
        ))}
      </div>
    </div>
  );
}

    