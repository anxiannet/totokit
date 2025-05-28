
// src/app/number-picking-tools/[toolId]/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Target, ListOrdered, PlayCircle, Database, Loader2 } from "lucide-react";
import type { HistoricalResult, HistoricalPerformanceDisplayData } from "@/lib/types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { 
  getPredictionForToolAndDraw, 
  getAllHistoricalResultsFromFirestore,
  getSavedHistoricalPredictionsForTool, // New action
} from "@/lib/actions";
import { ToolDetailPageClient } from "@/components/toto/ToolDetailPageClient";
import { calculateHitDetails } from "@/lib/totoUtils";


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

  // Fetch all actual historical data from Firestore
  const allHistoricalDataFromDb = await getAllHistoricalResultsFromFirestore();
  
  // Fetch the prediction saved by admin for the OFFICIAL_PREDICTIONS_DRAW_ID
  const initialSavedPredictionForOfficialDraw = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
  
  // Fetch all saved historical predictions for this specific tool
  const savedHistoricalPredictionsMap = await getSavedHistoricalPredictionsForTool(tool.id);

  let initialHistoricalPerformances: HistoricalPerformanceDisplayData[] = [];

  if (savedHistoricalPredictionsMap && allHistoricalDataFromDb.length > 0) {
    // Iterate over all historical data (or a relevant subset for display, e.g., last 10-20)
    // For simplicity, let's process all available historical draws to find saved predictions
    // Note: `allHistoricalDataFromDb` is sorted descending by drawNumber
    const historicalDrawsToAnalyze = allHistoricalDataFromDb; // Or slice if you want to limit displayed count

    for (const historicalDraw of historicalDrawsToAnalyze) {
      const drawKey = String(historicalDraw.drawNumber);
      const savedPredictionDetail = savedHistoricalPredictionsMap[drawKey];

      if (savedPredictionDetail && savedPredictionDetail.predictedNumbers) {
        const predictedNumbers = savedPredictionDetail.predictedNumbers;
        const hitDetails = calculateHitDetails(predictedNumbers, historicalDraw);
        const hitRate = historicalDraw.numbers.length > 0 && predictedNumbers.length > 0
          ? (hitDetails.mainHitCount / Math.min(predictedNumbers.length, 6)) * 100
          : 0;
        const hasAnyHit = hitDetails.mainHitCount > 0 || (hitDetails.matchedAdditionalNumberDetails?.matched ?? false);

        // Determine predictionBasisDraws (This part is tricky if not saved with prediction)
        // For now, we'll leave it null for saved predictions, or indicate it's from saved data.
        let predictionBasisDraws: string | null = "基于已保存的数据库预测";
        
        // Find the original index of this historicalDraw in the full list to find preceding draws for "basis"
        // This part is more relevant if we were RE-CALCULATING. For displaying SAVED, we just show what was saved.
        // We might need to store basis info with prediction if we want to show it for saved ones.
        // For now, the description will be generic.

        initialHistoricalPerformances.push({
          targetDraw: historicalDraw,
          predictedNumbersForTargetDraw: predictedNumbers,
          hitDetails,
          hitRate: parseFloat(hitRate.toFixed(1)),
          hasAnyHit,
          predictionBasisDraws,
          isSavedPrediction: true, // Mark as based on saved data
        });
      }
    }
  }


  const serializableTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
  };
  

  return (
    <ToolDetailPageClient
      tool={serializableTool}
      initialSavedPrediction={initialSavedPredictionForOfficialDraw}
      allHistoricalDataForPerformanceAnalysis={allHistoricalDataFromDb} 
      initialHistoricalPerformances={initialHistoricalPerformances.length > 0 ? initialHistoricalPerformances : null}
    />
  );
}
