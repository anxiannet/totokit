
"use client";

import { useState, useEffect } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import type { TotoCombination, HistoricalResult } from "@/lib/types";
import { CurrentAndLatestDrawInfo } from "@/components/toto/CurrentAndLatestDrawInfo";
import { TopPerformingTools, type TopToolDisplayInfo } from "@/components/toto/TopPerformingTools";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { calculateHitDetails } from "@/lib/totoUtils";


export default function TotoForecasterPage() {
  const [predictions, setPredictions] = useState<TotoCombination[]>([]);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState<boolean>(false);
  const [displayResultsArea, setDisplayResultsArea] = useState<boolean>(false);
  const [topPerformingTools, setTopPerformingTools] = useState<TopToolDisplayInfo[]>([]);

  const handlePredictionsGenerated = (newPredictions: TotoCombination[]) => {
    setPredictions(newPredictions);
    if (newPredictions.length > 0) {
      setDisplayResultsArea(true);
    }
  };
  
  const handleLoadingChange = (isLoading: boolean) => {
    setIsGeneratingPredictions(isLoading);
    if (isLoading) {
      setDisplayResultsArea(true); 
    }
  };

  const handleUsageStatusChange = (hasUsed: boolean) => {
    if (hasUsed) {
      setDisplayResultsArea(true);
    }
  };

  useEffect(() => {
    const allHistoricalData = MOCK_HISTORICAL_DATA;
    const numOverallRecentDraws = 10; // Analyze past 10 draws for tool performance
    
    // Ensure we have enough data to select 10, or take what's available
    const overallRecentTenDraws = allHistoricalData.slice(0, Math.min(allHistoricalData.length, numOverallRecentDraws));
    
    // For current prediction, use the absolute latest 10 draws (or fewer if not available)
    const absoluteLatestTenDraws = allHistoricalData.slice(0, Math.min(allHistoricalData.length, 10));
  
    const toolPerformances: TopToolDisplayInfo[] = dynamicTools.map(tool => {
      let totalHitRate = 0;
      let drawsAnalyzed = 0;
  
      if (overallRecentTenDraws.length > 0) {
        overallRecentTenDraws.forEach(targetDraw => {
          const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
          // This check should ideally not be -1 if overallRecentTenDraws comes from allHistoricalData
          if (originalIndex === -1) return; 
    
          const precedingDrawsStartIndex = originalIndex + 1;
          // Ensure we don't go out of bounds with slice. Slice handles end > length gracefully.
          const precedingTenDrawsForTarget = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsStartIndex + 10);
    
          let predictedNumbersForTargetDraw: number[] = [];
          
          // Specific conditions for tools needing exact number of preceding draws
          if (tool.id === "dynamicLastDrawRepeat" && precedingTenDrawsForTarget.length < 1 && originalIndex < allHistoricalData.length -1) {
            // This case should be handled by algoLastDrawRepeat returning [] if data is insufficient
            // but the check here prevents calling it if it's truly the last draw and no preceding exists.
          } else if (tool.id === "dynamicSecondLastDrawRepeat" && precedingTenDrawsForTarget.length < 1 && originalIndex < allHistoricalData.length - 2) {
            // Similar for second last.
          }
          // All algorithms in numberPickingAlgos.ts should handle cases where `precedingTenDrawsForTarget` might be shorter than 10.
          predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDrawsForTarget);
          
    
          if (predictedNumbersForTargetDraw.length > 0 && targetDraw.numbers.length > 0) {
            const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
            // Use the more robust hit rate calculation
            const hitRate = (hitDetails.mainHitCount / Math.min(targetDraw.numbers.length, predictedNumbersForTargetDraw.length)) * 100;
            totalHitRate += hitRate;
            drawsAnalyzed++;
          }
        });
      }
  
      const averageHitRate = drawsAnalyzed > 0 ? totalHitRate / drawsAnalyzed : 0;
  
      // Generate current prediction based on absolute latest 10 available draws
      const currentPrediction = tool.algorithmFn(absoluteLatestTenDraws);
  
      return {
        ...tool, // Spread the base tool info (id, name, description, algorithmFn)
        averageHitRate: parseFloat(averageHitRate.toFixed(1)),
        currentPrediction: currentPrediction,
      };
    });
  
    toolPerformances.sort((a, b) => b.averageHitRate - a.averageHitRate);
    setTopPerformingTools(toolPerformances.slice(0, 3)); // Show top 3
  
  }, []); // Empty dependency array: run once on mount


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        <CurrentAndLatestDrawInfo />
        
        <div className="w-full space-y-6 mt-6">
          <PredictionConfigurator 
            onPredictionsGenerated={handlePredictionsGenerated}
            onLoadingChange={handleLoadingChange}
            onUsageStatusChange={handleUsageStatusChange}
          />
          {(displayResultsArea || isGeneratingPredictions) && (
            <PredictionResultsDisplay predictions={predictions} isLoading={isGeneratingPredictions} />
          )}
          <TopPerformingTools tools={topPerformingTools} />
        </div>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        TOTOKIT &copy; {new Date().getFullYear()}. 仅供娱乐。请理性游戏。
      </footer>
    </div>
  );
}

