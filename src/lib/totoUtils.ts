
import { format, type Locale } from "date-fns";
import { zhCN } from "date-fns/locale"; // Import Chinese locale for date-fns
import type { HistoricalResult, TotoCombination } from "./types";

export const getBallColor = (number: number, isAdditional: boolean = false): string => {
  if (isAdditional) return "bg-destructive text-destructive-foreground";
  return "bg-blue-600 text-white";
};

export const formatDateToLocale = (dateString: string, locale: Locale = zhCN) => {
  // console.log("[formatDateToLocale] Received dateString:", dateString, "Locale code:", locale ? locale.code : "undefined"); // Diagnostic log
  try {
    if (!dateString) return ""; // Handle empty date string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Check for invalid date
      // console.error("[formatDateToLocale] Invalid date string provided:", dateString);
      return dateString; // Return original string if date is invalid
    }

    if (locale && locale.code === "zh-CN") {
      // console.log("[formatDateToLocale] Using zh-CN format for date:", dateString);
      return format(date, "yyyy年M月d日", { locale });
    }
    // console.log("[formatDateToLocale] Using default PPP format for locale:", locale ? locale.code : "undefined", "for date:", dateString);
    return format(date, "PPP", { locale }); // Fallback to PPP for other locales
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Return original string on error
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
        number: additionalWinningNumber,
        matched: additionalMatched
    },
    mainHitCount: matchedMainNumbers.length,
  };
}
