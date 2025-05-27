
import { format, type Locale } from "date-fns";
import { zhCN } from "date-fns/locale"; // Import Chinese locale for date-fns
import type { HistoricalResult, TotoCombination } from "./types";

export const getBallColor = (number: number, isAdditional: boolean = false): string => {
  if (isAdditional) return "bg-destructive text-destructive-foreground";
  return "bg-blue-600 text-white";
};

export const formatDateToLocale = (dateString: string, locale: Locale = zhCN) => {
  try {
    if (locale.code === 'zh-CN') {
      return format(new Date(dateString), "yyyy年M月d日", { locale });
    }
    return format(new Date(dateString), "PPP", { locale });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
};

export interface HitDetails {
  matchedMainNumbers: number[];
  matchedAdditionalNumberDetails: { number: number; matched: boolean };
  mainHitCount: number;
}

export function calculateHitDetails(
  toolNumbers: TotoCombination,
  historicalResult: HistoricalResult
): HitDetails {
  const winningMainNumbersSet = new Set(historicalResult.numbers);
  const additionalWinningNumber = historicalResult.additionalNumber;

  const matchedMainNumbers: number[] = [];
  let additionalMatched = false;

  toolNumbers.forEach(toolNum => {
    if (winningMainNumbersSet.has(toolNum)) {
      matchedMainNumbers.push(toolNum);
    }
    if (toolNum === additionalWinningNumber) {
      additionalMatched = true;
    }
  });

  return {
    matchedMainNumbers: matchedMainNumbers.sort((a, b) => a - b),
    matchedAdditionalNumberDetails: {
        number: additionalWinningNumber, // Return the actual additional number from historical result
        matched: additionalMatched
    },
    mainHitCount: matchedMainNumbers.length,
  };
}
