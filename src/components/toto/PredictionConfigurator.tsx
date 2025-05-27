
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
// Inputs and Labels are no longer needed as fields are removed
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// Accordion and its related icons are no longer needed
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// import { PlusCircle, Trash2 } from "lucide-react";
import { Wand2, Loader2 } from "lucide-react";
import type { WeightedCriterion, TotoCombination } from "@/lib/types";
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export function PredictionConfigurator({ onPredictionsGenerated, onLoadingChange }: PredictionConfiguratorProps) {
  const { toast } = useToast();
  // These state variables will now hold default/empty values as UI is removed
  const [historicalData, setHistoricalData] = useState<string>("");
  const [luckyNumbers, setLuckyNumbers] = useState<string>("");
  const [excludeNumbers, setExcludeNumbers] = useState<string>("");
  const [numberOfCombinations, setNumberOfCombinations] = useState<number>(10);
  const [weightedCriteria, setWeightedCriteria] = useState<WeightedCriterion[]>([
    { id: crypto.randomUUID(), name: "HotNumbers", weight: 0.7 },
    { id: crypto.randomUUID(), name: "OddEvenBalance", weight: 0.3 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handlers for criteria are no longer needed if UI is removed, but logic can be kept for future
  // const handleAddCriterion = () => {
  //   setWeightedCriteria([...weightedCriteria, { id: crypto.randomUUID(), name: "", weight: 0.5 }]);
  // };

  // const handleRemoveCriterion = (id: string) => {
  //   setWeightedCriteria(weightedCriteria.filter(c => c.id !== id));
  // };

  // const handleCriterionChange = (id: string, field: "name" | "weight", value: string | number) => {
  //   setWeightedCriteria(
  //     weightedCriteria.map(c => (c.id === id ? { ...c, [field]: field === "weight" ? Number(value) : value } : c))
  //   );
  // };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    onLoadingChange(true);

    // Values passed to generateTotoPredictions will be the initial/empty state values
    const result = await generateTotoPredictions(
      historicalData, 
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
                description: "AI无法根据当前参数生成组合。请尝试调整参数。", // This message might need adjustment as parameters are no longer user-configurable
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
    // CardHeader and CardContent are removed
    <Card>
      <form onSubmit={handleSubmit}>
        {/* CardContent containing Accordion and inputs is removed */}
        <CardFooter className="pt-6"> {/* Added pt-6 to CardFooter as it's now the first visible element inside Card */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            生成预测号码
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
