// src/app/number-picking-tools/[toolId]/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Target, Info, DatabaseZap, Save, Loader2 } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA, OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { FavoriteStarButton } from "@/components/toto/FavoriteStarButton";
import { dynamicTools, type NumberPickingTool } from "@/lib/numberPickingAlgos";
import { getPredictionForToolAndDraw } from "@/lib/actions";
import { ToolDetailPageClient } from "@/components/toto/ToolDetailPageClient";
import { auth } from "@/lib/firebase"; // Import server-side auth if needed for initial user state

export async function generateStaticParams() {
  return dynamicTools.map((tool) => ({
    toolId: tool.id,
  }));
}

export default async function SingleNumberToolPage({
  params,
}: {
  params: { toolId: string };
}) {
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

  // Fetch initial data on the server
  const initialSavedPrediction = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;
  const absoluteLatestTenDrawsForDynamic: HistoricalResult[] = allHistoricalData.slice(0, 10);
  const dynamicallyGeneratedCurrentPrediction = tool.algorithmFn(absoluteLatestTenDrawsForDynamic);
  
  // Note: For user information in a Server Component that needs to be passed to a Client Component,
  // you'd typically get it from a server-side auth session or similar mechanism.
  // Firebase client SDK's `auth.currentUser` is client-side.
  // For simplicity here, we're not deeply integrating server-side auth for passing user to client component,
  // the ClientComponent will use its own `useAuth`. If you need user info here for other server logic,
  // you'd use NextAuth.js or Firebase Admin SDK with cookies.
  // For the isAdmin check, it's better done within the client component after auth state is resolved.

  return (
    <ToolDetailPageClient
      tool={tool}
      initialSavedPrediction={initialSavedPrediction}
      allHistoricalData={allHistoricalData}
      dynamicallyGeneratedCurrentPrediction={dynamicallyGeneratedCurrentPrediction}
    />
  );
}
