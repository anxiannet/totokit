
"use client";

import { useState, useEffect } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import type { TotoCombination } from "@/lib/types";
import { CurrentAndLatestDrawInfo } from "@/components/toto/CurrentAndLatestDrawInfo";
import { TopPerformingTools, type TopToolDisplayInfo } from "@/components/toto/TopPerformingTools";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { calculateHitDetails } from "@/lib/totoUtils";
import { useAuth } from '@/hooks/useAuth'; // For user info
import { getUserSmartPickResults } from '@/lib/actions'; // To fetch saved results
import { useToast } from "@/hooks/use-toast";


export default function TotoForecasterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<TotoCombination[]>([]);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState<boolean>(false);
  const [displayResultsArea, setDisplayResultsArea] = useState<boolean>(false); 
  const [topPerformingTools, setTopPerformingTools] = useState<TopToolDisplayInfo[]>([]);

  const CURRENT_DRAW_ID = "4082"; // Define current draw ID for fetching saved picks

  const handlePredictionsGenerated = (newPredictions: TotoCombination[]) => {
    setPredictions(newPredictions);
  };
  
  const handleLoadingChange = (isLoading: boolean) => {
    setIsGeneratingPredictions(isLoading);
    if (isLoading) {
      setDisplayResultsArea(true); 
    }
  };

  const handleUsageStatusChange = (hasUsed: boolean) => {
    console.log(`[TotoForecasterPage] handleUsageStatusChange called with hasUsed: ${hasUsed}`);
    if (hasUsed) {
      setDisplayResultsArea(true);
      console.log(`[TotoForecasterPage] displayResultsArea set to true by handleUsageStatusChange.`);
    }
  };

  // Effect to fetch saved smart picks if user has used the feature for the current draw
  useEffect(() => {
    const fetchSavedPicks = async () => {
      console.log(`[TotoForecasterPage] fetchSavedPicks: Attempting to fetch. User: ${user?.uid}, displayResultsArea: ${displayResultsArea}, !isGenerating: ${!isGeneratingPredictions}, preds.length: ${predictions.length}`);
      if (user && displayResultsArea && !isGeneratingPredictions && predictions.length === 0) {
        
        console.log(`[TotoForecasterPage] fetchSavedPicks: Conditions met. Fetching saved smart picks for user ${user.uid}, draw ${CURRENT_DRAW_ID}`);
        setIsGeneratingPredictions(true); // Show loader while fetching saved picks
        try {
          const savedPicks = await getUserSmartPickResults(user.uid, CURRENT_DRAW_ID);
          console.log(`[TotoForecasterPage] fetchSavedPicks: getUserSmartPickResults returned:`, savedPicks);
          if (savedPicks && savedPicks.length > 0) {
            setPredictions(savedPicks);
            console.log(`[TotoForecasterPage] fetchSavedPicks: setPredictions called with savedPicks.`);
            toast({ title: "已加载您本期保存的选号" });
          } else {
             console.log(`[TotoForecasterPage] fetchSavedPicks: No saved picks found or empty array returned.`);
             // toast({ title: "未找到您本期保存的选号", description:"您可能尚未为本期生成或保存号码。" });
          }
        } catch (error) {
          console.error("Error fetching saved smart picks:", error);
          toast({ title: "加载已保存选号失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
        } finally {
          setIsGeneratingPredictions(false);
        }
      } else {
        console.log(`[TotoForecasterPage] fetchSavedPicks: Conditions NOT met for fetching.`);
      }
    };

    fetchSavedPicks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, displayResultsArea]); // Rerun if user logs in/out or if displayResultsArea changes.


  // Calculate top performing tools (existing logic)
  useEffect(() => {
    const allHistoricalData = MOCK_HISTORICAL_DATA;
    const numOverallRecentDraws = 10; 
    
    const overallRecentTenDraws = allHistoricalData.slice(0, Math.min(allHistoricalData.length, numOverallRecentDraws));
    const absoluteLatestTenDraws = allHistoricalData.slice(0, Math.min(allHistoricalData.length, 10));
  
    const toolPerformances: TopToolDisplayInfo[] = dynamicTools.map(tool => {
      let totalHitRate = 0;
      let drawsAnalyzed = 0;
  
      if (overallRecentTenDraws.length > 0) {
        overallRecentTenDraws.forEach(targetDraw => {
          const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
          if (originalIndex === -1) return; 
    
          const precedingDrawsStartIndex = originalIndex + 1;
          const precedingTenDrawsForTarget = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsStartIndex + 10);
          
          let predictedNumbersForTargetDraw: number[] = tool.algorithmFn(precedingTenDrawsForTarget);
              
          if (predictedNumbersForTargetDraw.length > 0 && targetDraw.numbers.length > 0) {
            const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
            const hitRate = (hitDetails.mainHitCount / Math.min(targetDraw.numbers.length, predictedNumbersForTargetDraw.length)) * 100;
            totalHitRate += hitRate;
            drawsAnalyzed++;
          }
        });
      }
  
      const averageHitRate = drawsAnalyzed > 0 ? totalHitRate / drawsAnalyzed : 0;
      const currentPrediction = tool.algorithmFn(absoluteLatestTenDraws);
  
      return {
        ...tool, 
        averageHitRate: parseFloat(averageHitRate.toFixed(1)),
        currentPrediction: currentPrediction,
      };
    });
  
    toolPerformances.sort((a, b) => b.averageHitRate - a.averageHitRate);
    setTopPerformingTools(toolPerformances.slice(0, 3)); 
  
  }, []); 


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        <CurrentAndLatestDrawInfo />
        
        <div className="w-full space-y-6 mt-6">
          <TopPerformingTools tools={topPerformingTools} />
          <PredictionConfigurator 
            onPredictionsGenerated={handlePredictionsGenerated}
            onLoadingChange={handleLoadingChange}
            onUsageStatusChange={handleUsageStatusChange}
          />
          {(displayResultsArea || isGeneratingPredictions) && (
            <PredictionResultsDisplay predictions={predictions} isLoading={isGeneratingPredictions} />
          )}
        </div>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        TOTOKIT &copy; {new Date().getFullYear()}. 仅供娱乐。请理性游戏。
      </footer>
    </div>
  );
}
