
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert
import { Wand2, Loader2, Info } from "lucide-react"; // Added Info
import type { WeightedCriterion, TotoCombination } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

const CURRENT_DRAW_NUMBER = "4082"; // Define the current draw number

export function PredictionConfigurator({ onPredictionsGenerated, onLoadingChange }: PredictionConfiguratorProps) {
  const { toast } = useToast();
  const [luckyNumbers, setLuckyNumbers] = useState<string>("");
  const [excludeNumbers, setExcludeNumbers] = useState<string>("");
  const [numberOfCombinations, setNumberOfCombinations] = useState<number>(10);
  const [weightedCriteria, setWeightedCriteria] = useState<WeightedCriterion[]>([
    { id: crypto.randomUUID(), name: "HotNumbers", weight: 0.7 },
    { id: crypto.randomUUID(), name: "OddEvenBalance", weight: 0.3 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUsedSmartPickThisDraw, setHasUsedSmartPickThisDraw] = useState<boolean>(false);

  useEffect(() => {
    // Check localStorage on mount
    const smartPickUsedKey = `smartPickUsed_${CURRENT_DRAW_NUMBER}`;
    const alreadyUsed = localStorage.getItem(smartPickUsedKey);
    if (alreadyUsed === 'true') {
      setHasUsedSmartPickThisDraw(true);
    }
  }, []);

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
        // Mark as used for this draw in this session
        const smartPickUsedKey = `smartPickUsed_${CURRENT_DRAW_NUMBER}`;
        localStorage.setItem(smartPickUsedKey, 'true');
        setHasUsedSmartPickThisDraw(true);
      }
      onPredictionsGenerated(result.combinations as TotoCombination[]);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardFooter className="pt-6 flex-col items-stretch space-y-4"> {/* Use flex-col and space-y */}
          <Button type="submit" className="w-full" disabled={isLoading || hasUsedSmartPickThisDraw}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            智能选号
          </Button>
          {hasUsedSmartPickThisDraw && (
            <Alert variant="default" className="mt-4">
              <Info className="h-5 w-5" />
              <AlertTitle>提示</AlertTitle>
              <AlertDescription>
                您已使用本期免费智能选号。如需更多组号码，请加入会员。
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
