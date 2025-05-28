// src/app/number-picking-tools/[toolId]/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { getPredictionForToolAndDraw, getAllHistoricalResultsFromFirestore, saveMultipleToolPredictions } from "@/lib/actions";
import { ToolDetailPageClient, type HistoricalPerformanceDisplayData } from "@/components/toto/ToolDetailPageClient"; // Ensure type is exported and imported
import { calculateHitDetails, TOTO_NUMBER_RANGE } from "@/lib/totoUtils";


export async function generateStaticParams() {
  return dynamicTools.map((tool) => ({
    toolId: tool.id,
  }));
}

interface SingleNumberToolPageProps {
  params: { toolId: string };
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
  
  // This is the prediction saved by admin for the OFFICIAL_PREDICTIONS_DRAW_ID
  const initialSavedPrediction = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
  
  // This is the dynamically generated prediction based on latest 10 from DB - for admin to see and potentially save
  const absoluteLatestTenDrawsForDynamic: HistoricalResult[] = allHistoricalDataFromDb.slice(0, 10);
  const dynamicallyGeneratedCurrentPrediction = tool.algorithmFn(absoluteLatestTenDrawsForDynamic);

  // Display performance for the 10 most recent draws from Firestore
  const recentTenHistoricalDrawsForAnalysis: HistoricalResult[] = allHistoricalDataFromDb.slice(0, 10);
  
  const historicalPerformancesToDisplay: HistoricalPerformanceDisplayData[] = recentTenHistoricalDrawsForAnalysis.map((targetDraw) => {
    const originalIndex = allHistoricalDataFromDb.findIndex(d => d.drawNumber === targetDraw.drawNumber);
    if (originalIndex === -1) return null;

    const precedingDrawsStartIndex = originalIndex + 1;
    const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
    
    let predictionBasisDraws: string | null = null;
    let predictedNumbersForTargetDraw: number[] = [];

    if (precedingDrawsEndIndex <= allHistoricalDataFromDb.length) { 
      const precedingTenDraws = allHistoricalDataFromDb.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);
      
      if (precedingTenDraws.length > 0) {
        const firstPreceding = precedingTenDraws[0]; 
        const lastPreceding = precedingTenDraws[precedingTenDraws.length - 1]; 
        if (firstPreceding && lastPreceding) {
             predictionBasisDraws = `基于期号: ${firstPreceding.drawNumber}${precedingTenDraws.length > 1 ? ` - ${lastPreceding.drawNumber}` : ''} (共${precedingTenDraws.length}期)`;
        } else {
            predictionBasisDraws = "无足够前期数据";
        }
      } else {
        predictionBasisDraws = "无足够前期数据";
      }
      
      if (tool.algorithmFn && precedingTenDraws.length > 0) { 
          predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
      }
    } else {
       const availablePrecedingCount = Math.max(0, allHistoricalDataFromDb.length - (originalIndex + 1));
      predictionBasisDraws = `无足够前期数据 (历史数据不足10期, 仅有${availablePrecedingCount}期)`;
    }


    const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
        ? (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, TOTO_NUMBER_RANGE.max )) * 100
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
      initialSavedPrediction={initialSavedPrediction} // Pass the resolved value
      dynamicallyGeneratedCurrentPrediction={dynamicallyGeneratedCurrentPrediction}
      historicalPerformancesToDisplay={historicalPerformancesToDisplay}
      allHistoricalDataForSaving={allHistoricalDataFromDb}
    />
  );
}
