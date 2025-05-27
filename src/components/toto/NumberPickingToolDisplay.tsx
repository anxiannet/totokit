
"use client";

import type { TotoCombination } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface NumberPickingToolDisplayProps {
  numbers: TotoCombination | null; // Can still be null if a tool somehow has no numbers
}

export function NumberPickingToolDisplay({ numbers }: NumberPickingToolDisplayProps) {
  if (!numbers || numbers.length === 0) {
    // This case should ideally not happen if all tools have predefined numbers
    return <p className="text-sm text-muted-foreground mt-2">此工具当前未提供号码。</p>;
  }

  const getBallColor = (number: number): string => {
    // Using a consistent color for these tool-generated numbers
    // e.g. chart-3 (Teal/Green)
    return "bg-[hsl(var(--chart-3))] text-primary-foreground"; 
  };

  return (
    <div className="mt-4 p-3 bg-muted/50 rounded-md">
      <h4 className="font-semibold mb-2 text-sm">推荐号码 ({numbers.length}个):</h4>
      <div className="flex flex-wrap gap-2 items-center justify-start"> {/* Changed to justify-start */}
        {numbers.map((num, index) => (
          <Badge
            key={`${num}-${index}-${Math.random()}`} // Added Math.random for better key uniqueness if numbers can repeat across different tools in a rare case, though they shouldn't within one tool
            className={`flex items-center justify-center w-9 h-9 rounded-full text-base font-bold shadow-md ${getBallColor(num)}`}
          >
            {num}
          </Badge>
        ))}
      </div>
    </div>
  );
}
