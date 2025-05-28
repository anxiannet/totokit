
"use client";

import { useState, useEffect } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import type { TotoCombination, HistoricalResult } from "@/lib/types"; // Ensure HistoricalResult is imported
import { CurrentAndLatestDrawInfo } from "@/components/toto/CurrentAndLatestDrawInfo";
import { TopPerformingTools, type TopToolDisplayInfo } from "@/components/toto/TopPerformingTools";
import { LastDrawTopTools, type LastDrawToolPerformanceInfo } from "@/components/toto/LastDrawTopTools"; // New import
import { MOCK_HISTORICAL_DATA, MOCK_LATEST_RESULT } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { calculateHitDetails } from "@/lib/totoUtils";
import { useAuth } from '@/hooks/useAuth';
import { getUserSmartPickResults } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";


export default function TotoForecasterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<TotoCombination[]>([]);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState<boolean>(false);
  const [displayResultsArea, setDisplayResultsArea] = useState<boolean>(false);
  const [topPerformingTools, setTopPerformingTools] = useState<TopToolDisplayInfo[]>([]);
  const [lastDrawTopPerformingTools, setLastDrawTopPerformingTools] = useState<LastDrawToolPerformanceInfo[]>([]); // New state

  const CURRENT_DRAW_ID = "4082";

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

  useEffect(() => {
    const fetchSavedPicks = async () => {
      console.log(`[TotoForecasterPage] fetchSavedPicks: Attempting to fetch. User: ${user?.uid}, displayResultsArea: ${displayResultsArea}, !isGenerating: ${!isGeneratingPredictions}, preds.length: ${predictions.length}`);
      if (user && displayResultsArea && !isGeneratingPredictions && predictions.length === 0) {
        console.log(`[TotoForecasterPage] fetchSavedPicks: Conditions met. Fetching saved smart picks for user ${user.uid}, draw ${CURRENT_DRAW_ID}`);
        setIsGeneratingPredictions(true);
        try {
          const savedPicks = await getUserSmartPickResults(user.uid, CURRENT_DRAW_ID);
          console.log(`[TotoForecasterPage] fetchSavedPicks: getUserSmartPickResults returned:`, savedPicks);
          if (savedPicks && savedPicks.length > 0) {
            setPredictions(savedPicks);
            console.log(`[TotoForecasterPage] fetchSavedPicks: setPredictions called with savedPicks.`);
            toast({ title: "已加载您本期保存的选号" });
          } else {
            console.log(`[TotoForecasterPage] fetchSavedPicks: No saved picks found or empty array returned.`);
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
  }, [user, displayResultsArea]);


  useEffect(() => {
    // Calculate top performing tools over last 10 draws (existing logic)
    const allHistoricalData = MOCK_HISTORICAL_DATA;
    const numOverallRecentDraws = 10;
    const overallRecentTenDraws = allHistoricalData.slice(0, Math.min(allHistoricalData.length, numOverallRecentDraws));
    const absoluteLatestTenDrawsForCurrentPred = allHistoricalData.slice(0, Math.min(allHistoricalData.length, 10));

    const toolPerformances: TopToolDisplayInfo[] = dynamicTools.map(tool => {
      let totalHitRate = 0;
      let drawsAnalyzed = 0;
      if (overallRecentTenDraws.length > 0) {
        overallRecentTenDraws.forEach(targetDraw => {
          const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
          if (originalIndex === -1 || originalIndex + 10 >= allHistoricalData.length) return;
          const precedingTenDrawsForTarget = allHistoricalData.slice(originalIndex + 1, originalIndex + 1 + 10);
          if (precedingTenDrawsForTarget.length < 10) return;

          let predictedNumbersForTargetDraw: number[] = tool.algorithmFn(precedingTenDrawsForTarget);
          if (predictedNumbersForTargetDraw.length > 0 && targetDraw.numbers.length > 0) {
            const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
            const hitRate = (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, 6)) * 100;
            totalHitRate += hitRate;
            drawsAnalyzed++;
          }
        });
      }
      const averageHitRate = drawsAnalyzed > 0 ? totalHitRate / drawsAnalyzed : 0;
      const currentPrediction = tool.algorithmFn(absoluteLatestTenDrawsForCurrentPred);
      return { ...tool, averageHitRate: parseFloat(averageHitRate.toFixed(1)), currentPrediction };
    });
    toolPerformances.sort((a, b) => b.averageHitRate - a.averageHitRate);
    setTopPerformingTools(toolPerformances.slice(0, 3));


    // New logic: Calculate top tools for the single latest draw
    const latestDraw = MOCK_LATEST_RESULT;
    if (latestDraw && allHistoricalData.length > 10) { // Need at least 10 previous draws for prediction base
        // Data for predicting the MOCK_LATEST_RESULT: draws from index 1 to 10
        const precedingTenDrawsForLatest = allHistoricalData.slice(1, 11);

        if (precedingTenDrawsForLatest.length === 10) {
            const singleDrawPerformances: LastDrawToolPerformanceInfo[] = dynamicTools.map(tool => {
                const predictedNumbers = tool.algorithmFn(precedingTenDrawsForLatest);
                const hitDetails = calculateHitDetails(predictedNumbers, latestDraw);
                let hitRate = 0;
                if (predictedNumbers.length > 0) {
                    // Using Math.min(predictedNumbers.length, 6) for hit rate calculation against 6 winning numbers
                    const denominator = Math.min(predictedNumbers.length, 6);
                    hitRate = denominator > 0 ? (hitDetails.mainHitCount / denominator) * 100 : 0;
                }
                return {
                    id: tool.id,
                    name: tool.name,
                    predictionForLastDraw: predictedNumbers,
                    hitRateForLastDraw: parseFloat(hitRate.toFixed(1)),
                    hitDetailsForLastDraw: hitDetails,
                };
            });

            singleDrawPerformances.sort((a, b) => b.hitRateForLastDraw - a.hitRateForLastDraw);
            setLastDrawTopPerformingTools(singleDrawPerformances.slice(0, 5));
        } else {
            console.warn("[TotoForecasterPage] Not enough preceding historical data to calculate performance for the latest draw.");
            setLastDrawTopPerformingTools([]);
        }
    } else {
        console.warn("[TotoForecasterPage] Not enough historical data to determine latest draw or its preceding draws.");
        setLastDrawTopPerformingTools([]);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        <CurrentAndLatestDrawInfo />

        <div className="w-full space-y-6 mt-6">
          <TopPerformingTools tools={topPerformingTools} />
          <LastDrawTopTools tools={lastDrawTopPerformingTools} latestDrawNumber={MOCK_LATEST_RESULT?.drawNumber} /> {/* New component */}
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
