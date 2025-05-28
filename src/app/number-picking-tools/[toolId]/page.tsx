
// src/app/number-picking-tools/[toolId]/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { dynamicTools } from "@/lib/numberPickingAlgos";
import { 
  getPredictionForToolAndDraw, 
  getAllHistoricalResultsFromFirestore,
  saveMultipleToolPredictions,
  calculateHistoricalPerformances
} from "@/lib/actions";
import { ToolDetailPageClient, type HistoricalPerformanceDisplayData } from "@/components/toto/ToolDetailPageClient";


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

  // Fetch all historical data from Firestore for display and analysis
  const allHistoricalDataFromDb = await getAllHistoricalResultsFromFirestore();
  
  // Fetch the prediction saved by admin for the OFFICIAL_PREDICTIONS_DRAW_ID
  const initialSavedPrediction = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
  
  // We will no longer pre-calculate dynamicallyGeneratedCurrentPrediction here.
  // This will be handled on demand by the client component via a server action if needed.

  const serializableTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    // algorithmFn is not passed to client
  };
  

  return (
    <ToolDetailPageClient
      tool={serializableTool}
      initialSavedPrediction={initialSavedPrediction}
      // dynamicallyGeneratedCurrentPrediction will be null/fetched on demand now
      allHistoricalDataForPerformanceAnalysis={allHistoricalDataFromDb} 
    />
  );
}
