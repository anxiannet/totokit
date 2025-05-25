
import { format, type Locale } from "date-fns";
import { zhCN } from "date-fns/locale"; // Import Chinese locale for date-fns

export const getBallColor = (number: number, isAdditional: boolean = false): string => {
  if (isAdditional) return "bg-destructive text-destructive-foreground"; // Use themed destructive for additional
  if (number >= 1 && number <= 9) return "bg-red-500 text-white";
  if (number >= 10 && number <= 19) return "bg-blue-500 text-white";
  if (number >= 20 && number <= 29) return "bg-green-500 text-white";
  if (number >= 30 && number <= 39) return "bg-yellow-500 text-black";
  if (number >= 40 && number <= 49) return "bg-purple-500 text-white";
  return "bg-gray-500 text-white";
};

// Simplified date formatting for Chinese. For full i18n, use a more robust solution.
export const formatDateToLocale = (dateString: string, locale: Locale = zhCN) => {
  try {
    // For TOTO, dates are usually just YYYY-MM-DD, so PPP might be too verbose.
    // Let's use a more common format like 'yyyy年M月d日' for Chinese.
    // For simplicity, we'll keep it general for now but this is where you'd differentiate.
    if (locale.code === 'zh-CN') {
      return format(new Date(dateString), "yyyy年M月d日", { locale });
    }
    return format(new Date(dateString), "PPP", { locale });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Fallback
  }
};
