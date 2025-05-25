
import { format, type Locale } from "date-fns";
import { zhCN } from "date-fns/locale"; // Import Chinese locale for date-fns

export const getBallColor = (number: number, isAdditional: boolean = false): string => {
  if (isAdditional) return "bg-destructive text-destructive-foreground"; // Additional number keeps its distinct color (usually red)
  // All main winning numbers will use this single color
  return "bg-blue-600 text-white"; // Consistent blue for main winning numbers
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
