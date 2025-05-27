
"use client";

import type { TotoCombination } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface NumberPickingToolDisplayProps {
  numbers: TotoCombination | null;
}

export function NumberPickingToolDisplay({ numbers }: NumberPickingToolDisplayProps) {
  if (!numbers || numbers.length === 0) {
    return <p className="text-sm text-muted-foreground mt-2">点击“生成号码”按钮查看结果。</p>;
  }

  const getBallColor = (number: number): string => {
    // Using a consistent color for these tool-generated numbers
    // e.g. chart-3 (Teal/Green)
    return "bg-[hsl(var(--chart-3))] text-primary-foreground"; 
  };

  return (
    <div className="mt-4 p-3 bg-muted/50 rounded-md">
      <h4 className="font-semibold mb-2 text-sm">预测号码:</h4>
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {numbers.map((num, index) => (
          <Badge
            key={`${num}-${index}`}
            className={`flex items-center justify-center w-9 h-9 rounded-full text-base font-bold shadow-md ${getBallColor(num)}`}
          >
            {num}
          </Badge>
        ))}
      </div>
    </div>
  );
}
