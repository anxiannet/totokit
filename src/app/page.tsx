
"use client";

import { useState, useEffect } from 'react';
import { PredictionConfigurator } from "@/components/toto/PredictionConfigurator";
import { PredictionResultsDisplay } from "@/components/toto/PredictionResultsDisplay";
import type { TotoCombination } from "@/lib/types";
import { CurrentAndLatestDrawInfo } from "@/components/toto/CurrentAndLatestDrawInfo";
import { TopPerformingTools, type TopToolDisplayInfo } from "@/components/toto/TopPerformingTools";
import { LastDrawTopTools, type LastDrawToolPerformanceInfo } from "@/components/toto/LastDrawTopTools";
import { MOCK_HISTORICAL_DATA, MOCK_LATEST_RESULT, OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { calculateHitDetails } from "@/lib/totoUtils";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";


export default function TotoForecasterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<TotoCombination[]>([]);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState<boolean>(false);
  const [displayResultsArea, setDisplayResultsArea] = useState<boolean>(false); // Controls visibility of the results area
  const [topPerformingTools, setTopPerformingTools] = useState<TopToolDisplayInfo[]>([]);
  const [lastDrawTopPerformingTools, setLastDrawTopPerformingTools] = useState<LastDrawToolPerformanceInfo[]>([]);

  const CURRENT_DRAW_ID = OFFICIAL_PREDICTIONS_DRAW_ID;

  const handlePredictionsGenerated = (newPredictions: TotoCombination[]) => {
    setPredictions(newPredictions);
  };

  const handleLoadingChange = (isLoading: boolean) => {
    setIsGeneratingPredictions(isLoading);
    if (isLoading) {
      setDisplayResultsArea(true); // Always show results area when loading starts
    }
  };

  const handleUsageStatusChange = (hasUsedOrShouldShow: boolean) => {
    console.log(`[TotoForecasterPage] handleUsageStatusChange called with hasUsedOrShouldShow: ${hasUsedOrShouldShow}`);
    if (hasUsedOrShouldShow) {
      setDisplayResultsArea(true);
      console.log(`[TotoForecasterPage] displayResultsArea set to true by handleUsageStatusChange.`);
    } else {
      // This case might be less common now if admin always shows and non-admin shows if marker is set
      setDisplayResultsArea(false);
      console.log(`[TotoForecasterPage] displayResultsArea set to false by handleUsageStatusChange.`);
    }
  };

  useEffect(() => {
    const loadSavedPicksFromLocalStorage = () => {
      console.log(`[TotoForecasterPage] loadSavedPicks: Attempting to load. user: ${user?.uid}, displayResultsArea: ${displayResultsArea}, !isGenerating: ${!isGeneratingPredictions}, preds.length: ${predictions.length}`);
      // Only try to load if results area should be shown, not currently generating, and no predictions currently in state.
      if (displayResultsArea && !isGeneratingPredictions && predictions.length === 0) {
        const resultsKey = `smartPickResults_${CURRENT_DRAW_ID}_${user?.uid || 'guest'}`;
        console.log(`[TotoForecasterPage] loadSavedPicks: Attempting to load from localStorage key: ${resultsKey}`);
        setIsGeneratingPredictions(true); // Show loader while checking localStorage
        try {
          const savedPicksString = localStorage.getItem(resultsKey);
          if (savedPicksString) {
            const savedPicks = JSON.parse(savedPicksString) as TotoCombination[];
            if (savedPicks && savedPicks.length > 0) {
              setPredictions(savedPicks);
              console.log(`[TotoForecasterPage] loadSavedPicks: setPredictions called with localStorage picks.`);
              toast({ title: "已加载您本期保存的选号 (本地)" });
            } else {
              console.log(`[TotoForecasterPage] loadSavedPicks: No valid saved picks found in localStorage or empty array.`);
            }
          } else {
             console.log(`[TotoForecasterPage] loadSavedPicks: No data found in localStorage for key ${resultsKey}.`);
          }
        } catch (error) {
          console.error("Error loading saved smart picks from localStorage:", error);
          toast({ title: "加载本地选号失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
        } finally {
          setIsGeneratingPredictions(false);
        }
      } else {
         console.log(`[TotoForecasterPage] loadSavedPicks: Conditions NOT met for loading from localStorage.`);
      }
    };
    loadSavedPicksFromLocalStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, displayResultsArea, CURRENT_DRAW_ID, toast, predictions.length, isGeneratingPredictions]);


  useEffect(() => {
    const allHistoricalData = MOCK_HISTORICAL_DATA;
    const numOverallRecentDraws = 10;
    const overallRecentTenDraws = allHistoricalData.slice(0, Math.min(allHistoricalData.length, numOverallRecentDraws));

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
          if (targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0) { // Ensure predictedNumbersForTargetDraw is not empty
            const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
            const hitRate = (hitDetails.mainHitCount / predictedNumbersForTargetDraw.length) * 100;
            totalHitRate += hitRate;
            drawsAnalyzed++;
          }
        });
      }
      const averageHitRate = drawsAnalyzed > 0 ? totalHitRate / drawsAnalyzed : 0;
      return { ...tool, averageHitRate: parseFloat(averageHitRate.toFixed(1)) };
    });
    toolPerformances.sort((a, b) => b.averageHitRate - a.averageHitRate);
    setTopPerformingTools(toolPerformances.slice(0, 5));

    const latestDraw = MOCK_LATEST_RESULT;
    if (latestDraw && allHistoricalData.length > 10) {
        const precedingTenDrawsForLatest = allHistoricalData.slice(1, 11);

        if (precedingTenDrawsForLatest.length === 10) {
            const singleDrawPerformances: LastDrawToolPerformanceInfo[] = dynamicTools.map(tool => {
                const predictedNumbers = tool.algorithmFn(precedingTenDrawsForLatest);
                const hitDetails = calculateHitDetails(predictedNumbers, latestDraw);
                // Ensure predictedNumbers.length > 0 to avoid division by zero
                const hitRate = predictedNumbers.length > 0
                  ? (hitDetails.mainHitCount / predictedNumbers.length) * 100
                  : 0;
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
          <LastDrawTopTools tools={lastDrawTopPerformingTools} latestDrawNumber={MOCK_LATEST_RESULT?.drawNumber} />
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

