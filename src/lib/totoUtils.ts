
import { format, parse, type Locale } from "date-fns";
import { zhCN, enUS } from "date-fns/locale"; // Import Chinese and English locales for date-fns
import type { HistoricalResult, TotoCombination } from "./types";

export const getBallColor = (number: number, isAdditional: boolean = false): string => {
  if (isAdditional) return "bg-destructive text-destructive-foreground"; // Typically red
  return "bg-blue-600 text-white"; // Blue for main numbers
};

export const formatDateToLocale = (dateString: string, locale: Locale = zhCN) => {
  // console.log("[formatDateToLocale] Received dateString:", dateString, "Locale code:", locale ? locale.code : "undefined");
  try {
    if (!dateString) return "";
    // Attempt to parse common date formats if needed, assuming YYYY-MM-DD is standard
    const date = new Date(dateString + "T00:00:00"); // Ensure parsing as local date
    if (isNaN(date.getTime())) {
      // console.error("[formatDateToLocale] Invalid date string provided:", dateString);
      return dateString;
    }

    if (locale && locale.code === "zh-CN") {
      // console.log("[formatDateToLocale] Using zh-CN format for date:", dateString);
      return format(date, "yyyy年M月d日", { locale });
    }
    // console.log("[formatDateToLocale] Using default PPP format for locale:", locale ? locale.code : "undefined", "for date:", dateString);
    return format(date, "PPP", { locale });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
};

// Helper map for English day to Chinese "周X"
const dayToChineseDay: Record<string, string> = {
  "Mon": "周一",
  "Tue": "周二",
  "Wed": "周三",
  "Thu": "周四",
  "Fri": "周五",
  "Sat": "周六",
  "Sun": "周日",
};

export function formatDateTimeToChinese(dateTimeString: string): string {
  // Expected English input format: "EEE, dd MMM yyyy, h.mmaaa"
  // Example: "Thu, 29 May 2025, 6.30pm"
  let dateObj: Date;
  try {
    // Handle common variations: "h.mmaaa" or "h:mmaaa"
    const normalizedDateTimeString = dateTimeString.replace(/\./, ":");
    dateObj = parse(normalizedDateTimeString, "EEE, dd MMM yyyy, h:mmaaa", new Date(), { locale: enUS });
    if (isNaN(dateObj.getTime())) {
      // If parsing fails, it's not the expected English format, return original
      return dateTimeString;
    }
  } catch (e) {
    // If any other error during parsing, return original
    return dateTimeString;
  }

  // If parsing was successful, format to Chinese
  const yearMonthDayPart = format(dateObj, "yyyy年M月d日", { locale: zhCN });
  
  const englishDayShort = format(dateObj, "EEE", { locale: enUS }); // e.g., "Thu"
  const chineseWeekDay = dayToChineseDay[englishDayShort] || format(dateObj, "EEEE", { locale: zhCN }); // Fallback to "星期X"

  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();

  let timePeriod = "";
  let formattedHours = hours;

  // Specific override for "6.30pm" to "傍晚6点30分"
  if (hours === 18 && minutes === 30) { // 6:30 PM
    timePeriod = "傍晚";
    formattedHours = 6; // Display as 6 for 12-hour format
  } else {
    // General AM/PM to Chinese period
    if (hours >= 0 && hours < 6) { // Midnight to early morning
        timePeriod = "凌晨";
        if (hours === 0) formattedHours = 12; 
    } else if (hours >= 6 && hours < 12) { // Morning
        timePeriod = "上午";
    } else if (hours === 12) { // Noon
        timePeriod = "中午";
        formattedHours = 12;
    } else if (hours > 12 && hours < 18) { // Afternoon
        timePeriod = "下午";
        formattedHours = hours - 12;
    } else { // Evening
        timePeriod = "晚上";
        formattedHours = hours - 12;
    }
  }
  
  const timePart = `${timePeriod}${formattedHours}点${format(dateObj, "mm分")}`;

  return `${chineseWeekDay}, ${yearMonthDayPart}, ${timePart}`;
}


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

  if (toolNumbers && toolNumbers.length > 0) {
    toolNumbers.forEach(toolNum => {
        if (winningMainNumbersSet.has(toolNum)) {
        matchedMainNumbers.push(toolNum);
        }
        if (toolNum === additionalWinningNumber) {
        additionalMatched = true;
        }
    });
  }


  return {
    matchedMainNumbers: matchedMainNumbers.sort((a, b) => a - b),
    matchedAdditionalNumberDetails: {
        number: additionalWinningNumber,
        matched: additionalMatched
    },
    mainHitCount: matchedMainNumbers.length,
  };
}

// TOTO Number Range - also defined in types.ts, ensure consistency or import from there
export const TOTO_NUMBER_RANGE = { min: 1, max: 49 };
