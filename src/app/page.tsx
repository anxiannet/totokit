"use client";

import { useState } from 'react';
import { Header } from "@/components/layout/Header";
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import { LatestOfficialResults } from "@/components/toto/LatestOfficialResults";
import { WinChecker } from "@/components/toto/WinChecker";
import { AnalyticsDashboard } from "@/components/toto/AnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, CheckSquare, BarChart3, Trophy } from "lucide-react";
import type { TotoCombination } from "@/lib/types";

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
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        <Tabs defaultValue="predict" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="predict">
              <Wand2 className="mr-2 h-4 w-4" /> AI Predictor
            </TabsTrigger>
            <TabsTrigger value="results">
              <Trophy className="mr-2 h-4 w-4" /> Latest Results
            </TabsTrigger>
            <TabsTrigger value="checkWin">
              <CheckSquare className="mr-2 h-4 w-4" /> Win Checker
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
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
        TOTO Forecaster &copy; {new Date().getFullYear()}. For entertainment purposes only. Play responsibly.
      </footer>
    </div>
  );
}
