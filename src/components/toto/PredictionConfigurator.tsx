
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Wand2, Loader2 } from "lucide-react";
import type { WeightedCriterion, TotoCombination, HistoricalResult } from "@/lib/types"; // Added HistoricalResult
import { MOCK_HISTORICAL_DATA } from "@/lib/types"; // Added MOCK_HISTORICAL_DATA
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export function PredictionConfigurator({ onPredictionsGenerated, onLoadingChange }: PredictionConfiguratorProps) {
  const { toast } = useToast();
  // Default/empty values as UI for these was removed
  // const [historicalData, setHistoricalData] = useState<string>(""); // No longer used directly as state
  const [luckyNumbers, setLuckyNumbers] = useState<string>("");
  const [excludeNumbers, setExcludeNumbers] = useState<string>("");
  const [numberOfCombinations, setNumberOfCombinations] = useState<number>(10);
  const [weightedCriteria, setWeightedCriteria] = useState<WeightedCriterion[]>([
    { id: crypto.randomUUID(), name: "HotNumbers", weight: 0.7 },
    { id: crypto.randomUUID(), name: "OddEvenBalance", weight: 0.3 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    onLoadingChange(true);

    // Prepare historical data: latest 10 results
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
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardFooter className="pt-6">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            智能选号
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
