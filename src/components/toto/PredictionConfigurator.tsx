"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Wand2, Loader2 } from "lucide-react";
import type { WeightedCriterion, TotoCombination } from "@/lib/types";
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export function PredictionConfigurator({ onPredictionsGenerated, onLoadingChange }: PredictionConfiguratorProps) {
  const { toast } = useToast();
  const [historicalData, setHistoricalData] = useState<string>("");
  const [luckyNumbers, setLuckyNumbers] = useState<string>("");
  const [excludeNumbers, setExcludeNumbers] = useState<string>("");
  const [numberOfCombinations, setNumberOfCombinations] = useState<number>(10);
  const [weightedCriteria, setWeightedCriteria] = useState<WeightedCriterion[]>([
    { id: crypto.randomUUID(), name: "HotNumbers", weight: 0.7 },
    { id: crypto.randomUUID(), name: "OddEvenBalance", weight: 0.3 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAddCriterion = () => {
    setWeightedCriteria([...weightedCriteria, { id: crypto.randomUUID(), name: "", weight: 0.5 }]);
  };

  const handleRemoveCriterion = (id: string) => {
    setWeightedCriteria(weightedCriteria.filter(c => c.id !== id));
  };

  const handleCriterionChange = (id: string, field: "name" | "weight", value: string | number) => {
    setWeightedCriteria(
      weightedCriteria.map(c => (c.id === id ? { ...c, [field]: field === "weight" ? Number(value) : value } : c))
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    onLoadingChange(true);

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
        title: "Prediction Error",
        description: result.error,
        variant: "destructive",
      });
      onPredictionsGenerated([]);
    } else if (result.combinations) {
        if (result.combinations.length === 0) {
             toast({
                title: "No Combinations Generated",
                description: "The AI could not generate combinations with the current parameters. Try adjusting them.",
                variant: "default",
            });
        } else {
            toast({
                title: "Predictions Generated!",
                description: `Successfully generated ${result.combinations.length} combinations.`,
            });
        }
      onPredictionsGenerated(result.combinations as TotoCombination[]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          Configure AI Prediction
        </CardTitle>
        <CardDescription>
          Set parameters for the AI to generate TOTO number combinations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>Basic Parameters</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="luckyNumbers">Lucky Numbers (comma-separated)</Label>
                  <Input
                    id="luckyNumbers"
                    value={luckyNumbers}
                    onChange={(e) => setLuckyNumbers(e.target.value)}
                    placeholder="e.g., 7, 18, 23"
                  />
                </div>
                <div>
                  <Label htmlFor="excludeNumbers">Exclude Numbers (comma-separated)</Label>
                  <Input
                    id="excludeNumbers"
                    value={excludeNumbers}
                    onChange={(e) => setExcludeNumbers(e.target.value)}
                    placeholder="e.g., 4, 13, 44"
                  />
                </div>
                <div>
                  <Label htmlFor="numberOfCombinations">Number of Combinations to Generate</Label>
                  <Input
                    id="numberOfCombinations"
                    type="number"
                    value={numberOfCombinations}
                    onChange={(e) => setNumberOfCombinations(Math.max(1, parseInt(e.target.value, 10)))}
                    min="1"
                    max="50"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Weighted Criteria</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Define criteria and their weights for the AI. Weights are relative (e.g., 0.7 is stronger than 0.3).
                </p>
                {weightedCriteria.map((criterion, index) => (
                  <div key={criterion.id} className="flex items-end gap-2 p-2 border rounded-md">
                    <div className="flex-grow">
                      <Label htmlFor={`criterionName-${index}`}>Criterion Name</Label>
                      <Input
                        id={`criterionName-${index}`}
                        value={criterion.name}
                        onChange={(e) => handleCriterionChange(criterion.id, "name", e.target.value)}
                        placeholder="e.g., HotNumbersBoost"
                      />
                    </div>
                    <div className="w-1/3">
                      <Label htmlFor={`criterionWeight-${index}`}>Weight</Label>
                      <Input
                        id={`criterionWeight-${index}`}
                        type="number"
                        step="0.1"
                        value={criterion.weight}
                        onChange={(e) => handleCriterionChange(criterion.id, "weight", e.target.value)}
                        placeholder="e.g., 0.5"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCriterion(criterion.id)}
                      aria-label="Remove criterion"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddCriterion} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Criterion
                </Button>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Historical Data (Optional)</AccordionTrigger>
              <AccordionContent className="pt-4">
                <Label htmlFor="historicalData">Paste Historical TOTO Results (CSV or JSON format)</Label>
                <Textarea
                  id="historicalData"
                  value={historicalData}
                  onChange={(e) => setHistoricalData(e.target.value)}
                  placeholder="DrawNo,Date,Num1,Num2,Num3,Num4,Num5,Num6,AdditionalNo&#10;3920,2024-07-15,5,12,23,31,40,49,18"
                  rows={5}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Providing historical data can improve AI prediction accuracy. If empty, AI will use general patterns.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Predictions
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
