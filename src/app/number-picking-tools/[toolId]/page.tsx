// src/app/number-picking-tools/[toolId]/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { getPredictionForToolAndDraw, getAllHistoricalResultsFromFirestore, saveMultipleToolPredictions } from "@/lib/actions"; // Added getAllHistoricalResultsFromFirestore
import { ToolDetailPageClient } from "@/components/toto/ToolDetailPageClient";
import { calculateHitDetails, TOTO_NUMBER_RANGE } from "@/lib/totoUtils";


export async function generateStaticParams() {
  return dynamicTools.map((tool) => ({
    toolId: tool.id,
  }));
}

interface SingleNumberToolPageProps {
  params: { toolId: string };
}

// Define the shape of the data passed to the client component
interface HistoricalPerformanceDisplayData {
  targetDraw: HistoricalResult;
  predictedNumbersForTargetDraw: number[];
  hitDetails: ReturnType<typeof calculateHitDetails>;
  hitRate: number;
  hasAnyHit: boolean;
  predictionBasisDraws: string | null;
}


export default async function SingleNumberToolPage({
  params,
}: SingleNumberToolPageProps) {
  const { toolId } = params;
  const tool = dynamicTools.find((t) => t.id === toolId);

  if (!tool) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 text-center">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-xl mb-4">工具未找到</p>
          <Button asChild variant="outline">
            <Link href="/number-picking-tools">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回工具列表
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fetch all historical data from Firestore
  const allHistoricalDataFromDb = await getAllHistoricalResultsFromFirestore();
  
  // If Firestore fetch fails or returns no data, we might want a fallback or error display.
  // For now, if allHistoricalDataFromDb is empty, subsequent slices will also be empty.

  const initialSavedPrediction = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
  
  const absoluteLatestTenDrawsForDynamic: HistoricalResult[] = allHistoricalDataFromDb.slice(0, 10);
  const dynamicallyGeneratedCurrentPrediction = tool.algorithmFn(absoluteLatestTenDrawsForDynamic);

  // Display performance for the 10 most recent draws from Firestore
  const recentTenHistoricalDrawsForAnalysis: HistoricalResult[] = allHistoricalDataFromDb.slice(0, 10);
  
  const historicalPerformancesToDisplay: HistoricalPerformanceDisplayData[] = recentTenHistoricalDrawsForAnalysis.map((targetDraw) => {
    // Find the original index of targetDraw in the full dataset from DB to get preceding draws
    const originalIndex = allHistoricalDataFromDb.findIndex(d => d.drawNumber === targetDraw.drawNumber);
    if (originalIndex === -1) return null; // Should not happen if targetDraw is from allHistoricalDataFromDb

    const precedingDrawsStartIndex = originalIndex + 1; // +1 because slice(0) is the latest, so next older is +1 index
    const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
    
    let predictionBasisDraws: string | null = null;
    let predictedNumbersForTargetDraw: number[] = [];

    // Ensure we have 10 preceding draws from the DB data
    if (precedingDrawsEndIndex <= allHistoricalDataFromDb.length) { 
      const precedingTenDraws = allHistoricalDataFromDb.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);
      
      if (precedingTenDraws.length > 0) {
        const firstPreceding = precedingTenDraws[0]; // Most recent in the preceding 10
        const lastPreceding = precedingTenDraws[precedingTenDraws.length - 1]; // Oldest in the preceding 10
        if (firstPreceding && lastPreceding) {
             predictionBasisDraws = `基于期号: ${firstPreceding.drawNumber}${precedingTenDraws.length > 1 ? ` - ${lastPreceding.drawNumber}` : ''} (共${precedingTenDraws.length}期)`;
        } else {
            predictionBasisDraws = "无足够前期数据";
        }
      } else {
        predictionBasisDraws = "无足够前期数据";
      }
      
      if (tool.algorithmFn && precedingTenDraws.length > 0) { // Ensure there are draws to predict from
          predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
      }
    } else {
      predictionBasisDraws = `无足够前期数据 (历史数据不足${Math.min(10, allHistoricalDataFromDb.length - (originalIndex +1) )}期)`;
    }


    const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
        ? (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, TOTO_NUMBER_RANGE.max )) * 100 // TOTO_NUMBER_RANGE.max should be 6 for main numbers comparison
        : 0;
    const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

    return {
      targetDraw,
      predictedNumbersForTargetDraw,
      hitDetails,
      hitRate,
      hasAnyHit,
      predictionBasisDraws,
    };
  }).filter(Boolean) as HistoricalPerformanceDisplayData[];

  const serializableTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
  };
  

  return (
    <ToolDetailPageClient
      tool={serializableTool}
      initialSavedPrediction={initialSavedPrediction}
      dynamicallyGeneratedCurrentPrediction={dynamicallyGeneratedCurrentPrediction}
      historicalPerformancesToDisplay={historicalPerformancesToDisplay}
      allHistoricalDataForSaving={allHistoricalDataFromDb} // Pass Firestore data for admin saving
    />
  );
}
