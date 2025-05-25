
"use client";

import { useState } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import { LatestOfficialResults } from "@/components/toto/LatestOfficialResults";
import { WinChecker } from "@/components/toto/WinChecker";
import { AnalyticsDashboard } from "@/components/toto/AnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, CheckSquare, BarChart3, Trophy } from "lucide-react";
import type { TotoCombination } from "@/lib/types";
import { AllHistoricalResults } from '@/components/toto/AllHistoricalResults';
// Removed Header import: import { Header } from "@/components/layout/Header";


type TotoView = 'tabs' | 'allResults';

export default function TotoForecasterPage() {
  const [predictions, setPredictions] = useState<TotoCombination[]>([]);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<TotoView>('tabs');

  const handlePredictionsGenerated = (newPredictions: TotoCombination[]) => {
    setPredictions(newPredictions);
  };
  
  const handleLoadingChange = (isLoading: boolean) => {
    setIsGeneratingPredictions(isLoading);
  };

  const showAllResultsView = () => setCurrentView('allResults');
  const showTabsView = () => setCurrentView('tabs');

  // The Header component in layout.tsx will now need a way to trigger this.
  // For now, we remove the direct passing of this function.
  // We will need to refactor how onShowAllResults is triggered.
  // One option is to use React Context or a routing solution.

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header removed from here as it's in layout.tsx */}
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        {currentView === 'tabs' && (
          <Tabs defaultValue="predict" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
              <TabsTrigger value="predict">
                <Wand2 className="mr-2 h-4 w-4" /> AI 预测器
              </TabsTrigger>
              <TabsTrigger value="results">
                <Trophy className="mr-2 h-4 w-4" /> 最新结果
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
        )}

        {currentView === 'allResults' && (
          <AllHistoricalResults onBack={showTabsView} />
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        TOTOKIT &copy; {new Date().getFullYear()}. 仅供娱乐。请理性游戏。
      </footer>
    </div>
  );
}
