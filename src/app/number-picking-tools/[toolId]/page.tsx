
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Target, ListOrdered, PlayCircle, Database, Loader2 } from "lucide-react";
import type { HistoricalResult, HistoricalPerformanceDisplayData, CurrentDrawInfo } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { 
  getPredictionForToolAndDraw, 
  getAllHistoricalResultsFromFirestore,
  getSavedHistoricalPredictionsForTool,
  getCurrentDrawDisplayInfo, // New import
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

  // Fetch current draw settings to get the official prediction draw ID
  const currentDrawSettings: CurrentDrawInfo | null = await getCurrentDrawDisplayInfo();
  const officialDrawIdForPage = currentDrawSettings?.officialPredictionsDrawId || "4082"; // Fallback

  const allHistoricalDataFromDb = await getAllHistoricalResultsFromFirestore();
  
  const initialSavedPrediction = await getPredictionForToolAndDraw(tool.id, officialDrawIdForPage);
  
  const savedHistoricalPredictionsMap = await getSavedHistoricalPredictionsForTool(tool.id);

  let initialHistoricalPerformances: HistoricalPerformanceDisplayData[] = [];

  if (savedHistoricalPredictionsMap && allHistoricalDataFromDb.length > 0) {
    const historicalDrawsToAnalyze = allHistoricalDataFromDb; 

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
        
        // For saved predictions, we might not have the basis info readily available unless stored.
        // For now, indicate it's from saved data.
        let predictionBasisDraws: string | null = savedPredictionDetail.targetDrawDate === "PENDING_DRAW" 
            ? `基于官方预测期号: ${drawKey}`
            : `基于已保存的数据库预测 (期号: ${drawKey}, 日期: ${savedPredictionDetail.targetDrawDate})`;


        initialHistoricalPerformances.push({
          targetDraw: historicalDraw,
          predictedNumbersForTargetDraw: predictedNumbers,
          hitDetails,
          hitRate: parseFloat(hitRate.toFixed(1)),
          hasAnyHit,
          predictionBasisDraws,
          isSavedPrediction: true, 
        });
      }
    }
    // Sort by target draw number descending for display
    initialHistoricalPerformances.sort((a, b) => b.targetDraw.drawNumber - a.targetDraw.drawNumber);
  }


  const serializableTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
  };
  

  return (
    <ToolDetailPageClient
      tool={serializableTool}
      initialSavedPrediction={initialSavedPrediction}
      allHistoricalDataForPerformanceAnalysis={allHistoricalDataFromDb} 
      initialHistoricalPerformances={initialHistoricalPerformances.length > 0 ? initialHistoricalPerformances : null}
      officialDrawId={officialDrawIdForPage} // Pass the fetched/defaulted officialDrawId
    />
  );
}
