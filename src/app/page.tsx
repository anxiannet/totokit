
"use client";

import { useState } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2 } from "lucide-react";
import type { TotoCombination } from "@/lib/types";
import { CurrentAndLatestDrawInfo } from "@/components/toto/CurrentAndLatestDrawInfo";


export default function TotoForecasterPage() {
  const [predictions, setPredictions] = useState<TotoCombination[]>([]);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState<boolean>(false);

  const handlePredictionsGenerated = (newPredictions: TotoCombination[]) => {
    setPredictions(newPredictions);
  };
  
  const handleLoadingChange = (isLoading: boolean) => {
    setIsGeneratingPredictions(isLoading);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        <CurrentAndLatestDrawInfo />
        
        <Tabs defaultValue="predict" className="w-full">
          <TabsList className="grid w-full grid-cols-1 mb-6"> {/* Only one tab now */}
            <TabsTrigger value="predict">
              <Wand2 className="mr-2 h-4 w-4" /> AI 预测器
            </TabsTrigger>
            {/* Analytics TabTrigger removed */}
          </TabsList>

          <TabsContent value="predict" className="space-y-6">
            <PredictionConfigurator 
              onPredictionsGenerated={handlePredictionsGenerated}
              onLoadingChange={handleLoadingChange}
            />
            <PredictionResultsDisplay predictions={predictions} isLoading={isGeneratingPredictions} />
          </TabsContent>

          {/* Analytics TabsContent removed */}
        </Tabs>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        TOTOKIT &copy; {new Date().getFullYear()}. 仅供娱乐。请理性游戏。
      </footer>
    </div>
  );
}
