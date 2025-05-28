// src/app/number-picking-tools/[toolId]/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA, OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { dynamicTools, type NumberPickingTool } from "@/lib/numberPickingAlgos";
import { getPredictionForToolAndDraw } from "@/lib/actions";
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

  // Fetch initial "official" prediction for the current draw
  const initialSavedPrediction = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);

  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;

  // Calculate "current prediction" based on latest 10 historical draws for admin to potentially save
  const absoluteLatestTenDrawsForDynamic: HistoricalResult[] = allHistoricalData.slice(0, 10);
  const dynamicallyGeneratedCurrentPrediction = tool.algorithmFn(absoluteLatestTenDrawsForDynamic);

  // Calculate historical performances for display
  const recentTenHistoricalDrawsForAnalysis: HistoricalResult[] = allHistoricalData.slice(0, 10);
  const historicalPerformancesToDisplay = recentTenHistoricalDrawsForAnalysis.map((targetDraw) => {
    const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
    if (originalIndex === -1) return null;

    const precedingDrawsStartIndex = originalIndex + 1;
    const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
    
    if (precedingDrawsEndIndex > allHistoricalData.length) return null; 
    
    const precedingTenDraws = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

    let predictedNumbersForTargetDraw: number[] = [];
    if (tool.algorithmFn) {
        predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
    }

    const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
        ? (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, TOTO_NUMBER_RANGE.max /* Using max as a safeguard, ideally predictedNumbers.length */ )) * 100
        : 0;
    const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

    return {
      targetDraw,
      predictedNumbersForTargetDraw,
      hitDetails,
      hitRate,
      hasAnyHit,
    };
  }).filter(Boolean) as Array<{
    targetDraw: HistoricalResult;
    predictedNumbersForTargetDraw: number[];
    hitDetails: ReturnType<typeof calculateHitDetails>;
    hitRate: number;
    hasAnyHit: boolean;
  }>;

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
      allHistoricalDataForSaving={allHistoricalData} // Pass all historical data only for admin save historical action
    />
  );
}
