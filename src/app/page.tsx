
"use client";

import { useState } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
// Tabs components are no longer needed as we are removing the tab structure
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Wand2 icon was for the tab trigger, also not needed directly here unless we add a new title
// import { Wand2 } from "lucide-react"; 
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
        
        {/* Tabs structure removed. Content is now displayed directly. */}
        <div className="w-full space-y-6 mt-6"> {/* Added mt-6 for spacing similar to what TabsContent might have provided */}
          {/* You might want to add a title here if needed, e.g., 
            <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
              <Wand2 className="h-6 w-6 text-primary" /> AI 预测器
            </h2> 
          */}
          <PredictionConfigurator 
            onPredictionsGenerated={handlePredictionsGenerated}
            onLoadingChange={handleLoadingChange}
          />
          <PredictionResultsDisplay predictions={predictions} isLoading={isGeneratingPredictions} />
        </div>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        TOTOKIT &copy; {new Date().getFullYear()}. 仅供娱乐。请理性游戏。
      </footer>
    </div>
  );
}
