
"use client";

import { useState } from 'react';
// Removed Header import
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import { LatestOfficialResults } from "@/components/toto/LatestOfficialResults";
import { WinChecker } from "@/components/toto/WinChecker";
import { AnalyticsDashboard } from "@/components/toto/AnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, CheckSquare, BarChart3, Trophy as TrophyIcon } from "lucide-react"; // Renamed Trophy to avoid conflict
import type { TotoCombination } from "@/lib/types";
import { CurrentAndLatestDrawInfo } from "@/components/toto/CurrentAndLatestDrawInfo"; // Import the new component

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
      {/* Header is now in layout.tsx */}
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        <CurrentAndLatestDrawInfo /> {/* Add the new component here */}
        
        <Tabs defaultValue="predict" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="predict">
              <Wand2 className="mr-2 h-4 w-4" /> AI 预测器
            </TabsTrigger>
            <TabsTrigger value="results">
              <TrophyIcon className="mr-2 h-4 w-4" /> 最新结果
            </TabsTrigger>
            <TabsTrigger value="checkWin">
              <CheckSquare className="mr-2 h-4 w-4" /> 中奖检查器
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> 数据分析
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predict" className="space-y-6">
            <PredictionConfigurator 
              onPredictionsGenerated={handlePredictionsGenerated}
              onLoadingChange={handleLoadingChange}
            />
            <PredictionResultsDisplay predictions={predictions} isLoading={isGeneratingPredictions} />
          </TabsContent>

          <TabsContent value="results">
            <LatestOfficialResults />
          </TabsContent>

          <TabsContent value="checkWin">
            <WinChecker />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        TOTOKIT &copy; {new Date().getFullYear()}. 仅供娱乐。请理性游戏。
      </footer>
    </div>
  );
}
