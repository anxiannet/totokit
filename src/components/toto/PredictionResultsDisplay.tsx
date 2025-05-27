
"use client";

import type { TotoCombination } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Target, Info } from "lucide-react";

interface PredictionResultsDisplayProps {
  predictions: TotoCombination[];
  isLoading: boolean;
}

// Helper component for loading state to be used in PredictionResultsDisplay
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);


export function PredictionResultsDisplay({ predictions, isLoading }: PredictionResultsDisplayProps) {
  const getPredictionBallColor = (number: number): string => {
    // Using chart-5 (purple) for predicted numbers to differentiate from official results
    return "bg-[hsl(var(--chart-5))] text-primary-foreground"; 
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          第 4082 期智能选号结果
        </CardTitle>
        {/* CardDescription removed as per request */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">正在生成预测，请稍候...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] rounded-md border">
            <ul className="p-4 space-y-3">
              {predictions.map((combination, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center text-sm font-semibold">
                      {String.fromCharCode(65 + index)}
                    </Badge>
                    <div className="flex space-x-1 sm:space-x-1.5">
                      {combination.map((num) => (
                        <span
                          key={num}
                          className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold ${getPredictionBallColor(num)}`}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Score can be added here if provided by AI later */}
                  {/* <Badge variant="outline">Score: N/A</Badge> */}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

