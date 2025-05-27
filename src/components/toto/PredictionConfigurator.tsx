
"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link"; // Import Link
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Wand2, Loader2, FileText, AlertCircle } from "lucide-react";
import type { WeightedCriterion, TotoCombination, HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onUsageStatusChange?: (hasUsed: boolean) => void;
}

const CURRENT_DRAW_ID = "4082"; // Used for localStorage key

export function PredictionConfigurator({
  onPredictionsGenerated,
  onLoadingChange,
  onUsageStatusChange
}: PredictionConfiguratorProps) {
  const { toast } = useToast();
  const [luckyNumbers, setLuckyNumbers] = useState<string>(""); // Kept for future use, though UI removed
  const [excludeNumbers, setExcludeNumbers] = useState<string>(""); // Kept for future use
  const [numberOfCombinations, setNumberOfCombinations] = useState<number>(10); // Default
  const [weightedCriteria, setWeightedCriteria] = useState<WeightedCriterion[]>([ // Default
    { id: crypto.randomUUID(), name: "HotNumbers", weight: 0.7 },
    { id: crypto.randomUUID(), name: "OddEvenBalance", weight: 0.3 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUsedSmartPickThisDraw, setHasUsedSmartPickThisDraw] = useState<boolean>(false);

  useEffect(() => {
    const usageKey = `smartPickUsed_${CURRENT_DRAW_ID}`;
    const alreadyUsed = localStorage.getItem(usageKey) === 'true';
    if (alreadyUsed) {
      setHasUsedSmartPickThisDraw(true);
      if (onUsageStatusChange) {
        onUsageStatusChange(true);
      }
    }
  }, [onUsageStatusChange]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (hasUsedSmartPickThisDraw) {
      toast({
        title: "已使用",
        description: "您已使用本期免费智能选号。",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    onLoadingChange(true);
    if (onUsageStatusChange) {
      onUsageStatusChange(true);
    }

    const latestTenResults = MOCK_HISTORICAL_DATA.slice(0, 10);
    const historicalDataString = JSON.stringify(latestTenResults);

    const result = await generateTotoPredictions(
      historicalDataString,
      weightedCriteria,
      luckyNumbers,
      excludeNumbers,
      numberOfCombinations
    );

    setIsLoading(false);
    onLoadingChange(false);

    if ("error" in result) {
      toast({
        title: "预测错误",
        description: result.error,
        variant: "destructive",
      });
      onPredictionsGenerated([]);
    } else if (result.combinations) {
      if (result.combinations.length === 0) {
        toast({
          title: "未生成组合",
          description: "AI无法根据当前参数生成组合。",
          variant: "default",
        });
      } else {
        toast({
          title: "已生成预测！",
          description: `成功生成 ${result.combinations.length} 个组合。`,
        });
      }
      onPredictionsGenerated(result.combinations as TotoCombination[]);

      const usageKey = `smartPickUsed_${CURRENT_DRAW_ID}`;
      localStorage.setItem(usageKey, 'true');
      setHasUsedSmartPickThisDraw(true);
      if (onUsageStatusChange) { // Ensure status is updated after usage
        onUsageStatusChange(true);
      }
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        {/* UI for luckyNumbers, excludeNumbers, etc. was removed in a previous step */}
        <CardFooter className="pt-6">
          <div className="flex w-full gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || hasUsedSmartPickThisDraw}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              智能选号
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/self-select">
                <FileText className="mr-2 h-4 w-4" />
                自选号码
              </Link>
            </Button>
          </div>
        </CardFooter>
      </form>
      {hasUsedSmartPickThisDraw && (
        <div className="p-4 pt-0 text-sm">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              您已使用本期免费智能选号。如需更多组号码，请加入会员。
            </AlertDescription>
          </Alert>
        </div>
      )}
    </Card>
  );
}
