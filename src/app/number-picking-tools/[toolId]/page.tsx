
"use client"; // Required for admin save button, useAuth, useState, useEffect

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Info, Target, Loader2, Save, AlertCircle } from "lucide-react";
import type { HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA, OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { FavoriteStarButton } from "@/components/toto/FavoriteStarButton";
import {
  calculateHitDetails,
  getBallColor as getOfficialBallColor,
  formatDateToLocale,
} from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import { dynamicTools, type NumberPickingTool } from "@/lib/numberPickingAlgos";
import {
  saveToolPrediction,
  getPredictionForToolAndDraw,
  type ToolPredictionInput,
  saveMultipleToolPredictions, // Import the new batch save action
} from "@/lib/actions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Client Component for the Admin Save Button
function AdminSavePredictionButton({
  toolId,
  toolName,
  predictedNumbers,
  adminUserId,
  onSaveSuccess,
  currentDrawNumber,
}: {
  toolId: string;
  toolName: string;
  predictedNumbers: number[];
  adminUserId: string | null;
  onSaveSuccess: () => void;
  currentDrawNumber: string | number;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!adminUserId) {
      toast({ title: "错误", description: "管理员未登录。", variant: "destructive" });
      return;
    }
    if (!predictedNumbers || predictedNumbers.length === 0) {
      toast({ title: "提示", description: "没有可保存的预测号码 (动态生成为空)。", variant: "default" });
      return;
    }
    setIsSaving(true);
    try {
      const predictionData: ToolPredictionInput = {
        toolId: toolId,
        toolName: toolName,
        targetDrawNumber: currentDrawNumber,
        targetDrawDate: "PENDING_DRAW", // Or another suitable placeholder for current predictions
        predictedNumbers: predictedNumbers,
      };
      const result = await saveToolPrediction(predictionData);

      if (result.success) {
        toast({ title: "成功", description: result.message || `预测已为第 ${currentDrawNumber} 期保存/更新。` });
        onSaveSuccess(); // Notify parent to refetch saved prediction
      } else {
        toast({ title: "保存失败", description: result.message || "无法保存预测。", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "保存出错", description: error.message || "保存预测时发生错误。", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button onClick={handleSave} disabled={isSaving || !adminUserId} className="w-full mt-3">
      {isSaving ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      为第 {currentDrawNumber} 期保存/更新预测
    </Button>
  );
}


export default function SingleNumberToolPage({
  params,
}: {
  params: { toolId: string };
}) {
  const { toolId } = params;
  const tool = dynamicTools.find((t) => t.id === toolId);
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedPredictionForTargetDraw, setSavedPredictionForTargetDraw] = useState<number[] | null>(null);
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(true);
  const [dynamicallyGeneratedCurrentPrediction, setDynamicallyGeneratedCurrentPrediction] = useState<number[]>([]);

  const isAdmin = user && user.email === "admin@totokit.com";

  const fetchAndSetSavedPrediction = useCallback(async () => {
    if (!tool) return;
    setIsLoadingSavedPrediction(true);
    try {
      const saved = await getPredictionForToolAndDraw(tool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
      setSavedPredictionForTargetDraw(saved);
    } catch (error) {
      console.error(`Error fetching saved prediction for tool ${tool.id}, draw ${OFFICIAL_PREDICTIONS_DRAW_ID}:`, error);
      setSavedPredictionForTargetDraw(null);
    } finally {
      setIsLoadingSavedPrediction(false);
    }
  }, [tool]);

  useEffect(() => {
    if (tool) {
      const allHistoricalDataForDynamic: HistoricalResult[] = MOCK_HISTORICAL_DATA;
      const absoluteLatestTenDrawsForDynamic: HistoricalResult[] = allHistoricalDataForDynamic.slice(0, 10);
      const dynamicPred = tool.algorithmFn(absoluteLatestTenDrawsForDynamic);
      setDynamicallyGeneratedCurrentPrediction(dynamicPred);
      fetchAndSetSavedPrediction();
    }
  }, [tool, fetchAndSetSavedPrediction]);

  useEffect(() => {
    // This effect handles saving historical predictions (back-testing)
    // It runs only once when the tool is loaded, or if the tool itself changes.
    if (tool && MOCK_HISTORICAL_DATA.length > 0) {
      const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;
      const recentTenHistoricalDrawsForAnalysis: HistoricalResult[] = allHistoricalData.slice(0, 10);
      const predictionsToSave: ToolPredictionInput[] = [];

      recentTenHistoricalDrawsForAnalysis.forEach((targetDraw) => {
        const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
        if (originalIndex === -1) return;

        const precedingDrawsStartIndex = originalIndex + 1;
        const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
        const precedingTenDraws = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

        let predictedNumbersForTargetDraw: number[] = [];
        if (tool.algorithmFn) {
            predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
        }

        if (predictedNumbersForTargetDraw.length > 0) {
          predictionsToSave.push({
            toolId: tool.id,
            toolName: tool.name,
            targetDrawNumber: targetDraw.drawNumber,
            targetDrawDate: targetDraw.date,
            predictedNumbers: predictedNumbersForTargetDraw,
          });
        }
      });

      if (predictionsToSave.length > 0) {
        saveMultipleToolPredictions(predictionsToSave)
          .then(result => {
            if (result.success) {
              // console.log(`Successfully batch saved/updated ${result.savedCount} historical predictions for tool ${tool.id}`);
            } else {
              // console.error(`Failed to batch save historical predictions for tool ${tool.id}: ${result.message}`);
            }
          })
          .catch(error => {
            // console.error(`Error in batch saving historical predictions for tool ${tool.id}:`, error);
          });
      }
    }
  }, [tool]); // Only re-run if tool changes


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

  const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;
  const recentTenHistoricalDrawsForAnalysis: HistoricalResult[] = allHistoricalData.slice(0, 10);

  const historicalPerformancesToDisplay = recentTenHistoricalDrawsForAnalysis.map((targetDraw) => {
    const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
    if (originalIndex === -1) return null;

    const precedingDrawsStartIndex = originalIndex + 1;
    const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
    const precedingTenDraws = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

    let predictedNumbersForTargetDraw: number[] = [];
    if (tool.algorithmFn) {
        predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
    }

    const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
        ? (hitDetails.mainHitCount / Math.min(targetDraw.numbers.length, predictedNumbersForTargetDraw.length)) * 100
        : 0;
    const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

    return {
      targetDraw,
      predictedNumbersForTargetDraw,
      hitDetails,
      hitRate,
      hasAnyHit,
    };
  }).filter(Boolean);


  const OfficialDrawDisplay = ({ draw }: { draw: HistoricalResult }) => (
    <div className="flex flex-wrap gap-1.5 items-center">
      {draw.numbers.map((num) => (
        <Badge
          key={`official-${draw.drawNumber}-main-${num}`}
          className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(
            num,
            false
          )}`}
        >
          {num}
        </Badge>
      ))}
      <span className="mx-1 text-muted-foreground">+</span>
      <Badge
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(
          draw.additionalNumber,
          true
        )}`}
      >
        {draw.additionalNumber}
      </Badge>
    </div>
  );

  let displayNumbersForCurrentDrawSection: number[] = [];
  let currentDrawSectionTitle = `第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测号码:`;
  let showAdminSaveButton = false;

  if (isLoadingSavedPrediction) {
    // Loader shown below
  } else if (savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0) {
    displayNumbersForCurrentDrawSection = savedPredictionForTargetDraw;
  } else {
    if (isAdmin) {
      displayNumbersForCurrentDrawSection = dynamicallyGeneratedCurrentPrediction;
      currentDrawSectionTitle = `当前动态生成号码 (可保存为第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测):`;
      showAdminSaveButton = true;
    }
  }


  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/number-picking-tools">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工具列表
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-xl">
              {tool.name}
            </CardTitle>
            <FavoriteStarButton toolId={tool.id} toolName={tool.name} />
          </div>
          <CardDescription>{tool.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 pb-6 border-b">
            <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
                <Target className="h-5 w-5 text-primary" />
                {currentDrawSectionTitle}
            </h4>
            {isLoadingSavedPrediction ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>正在加载为第 {OFFICIAL_PREDICTIONS_DRAW_ID} 期保存的预测...</p>
              </div>
            ) : displayNumbersForCurrentDrawSection.length > 0 ? (
                <NumberPickingToolDisplay numbers={displayNumbersForCurrentDrawSection} />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isAdmin && !showAdminSaveButton ? "当前算法未生成号码。" : `第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测号码尚未由管理员生成。`}
              </p>
            )}

            {isAdmin && showAdminSaveButton && dynamicallyGeneratedCurrentPrediction.length > 0 && (
              <AdminSavePredictionButton
                toolId={tool.id}
                toolName={tool.name}
                predictedNumbers={dynamicallyGeneratedCurrentPrediction}
                adminUserId={user?.uid || null}
                onSaveSuccess={fetchAndSetSavedPrediction}
                currentDrawNumber={OFFICIAL_PREDICTIONS_DRAW_ID}
              />
            )}
             {isAdmin && savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 && (
              <AdminSavePredictionButton
                toolId={tool.id}
                toolName={tool.name}
                // Admin can update with latest dynamic even if one is saved.
                // Or, could choose to show the *saved* one here and a different button for "Re-generate & Update"
                predictedNumbers={dynamicallyGeneratedCurrentPrediction}
                adminUserId={user?.uid || null}
                onSaveSuccess={fetchAndSetSavedPrediction}
                currentDrawNumber={OFFICIAL_PREDICTIONS_DRAW_ID}
              />
            )}
            {!isAdmin && !isLoadingSavedPrediction && (!savedPredictionForTargetDraw || savedPredictionForTargetDraw.length === 0) && (
                 <Alert variant="default" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                        本工具对第 {OFFICIAL_PREDICTIONS_DRAW_ID} 期的预测号码尚未由管理员生成。
                    </AlertDescription>
                </Alert>
            )}
          </div>

          <div className="pt-0">
            <h4 className="text-md font-semibold mb-3">
              历史开奖动态预测表现 (最近10期):
            </h4>
            {historicalPerformancesToDisplay.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-600px)] rounded-md border p-3 space-y-4 bg-background/50">
                {historicalPerformancesToDisplay.map((performance) => {
                  if (!performance) return null;
                  const { targetDraw, predictedNumbersForTargetDraw, hitDetails, hitRate, hasAnyHit } = performance;
                  return (
                    <div
                      key={`${tool.id}-${targetDraw.drawNumber}`}
                      className={`p-3 border rounded-lg ${
                        hasAnyHit
                          ? "border-green-500/60 bg-green-500/10"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <p className="text-xs font-medium">
                          目标期号:{" "}
                          <span className="font-semibold text-primary">
                            {targetDraw.drawNumber}
                          </span>{" "}
                          ({formatDateToLocale(targetDraw.date, zhCN)})
                        </p>
                        {predictedNumbersForTargetDraw.length > 0 &&
                          (hasAnyHit ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500/80" />
                          ))}
                      </div>
                      <div className="mb-1.5">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          当期开奖号码:
                        </p>
                        <OfficialDrawDisplay draw={targetDraw} />
                      </div>
                      <div className="mb-1.5">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          工具针对本期预测号码 ({predictedNumbersForTargetDraw.length}{" "}
                          个):
                        </p>
                        {predictedNumbersForTargetDraw.length > 0 ? (
                          <NumberPickingToolDisplay
                            numbers={predictedNumbersForTargetDraw}
                            historicalResultForHighlight={targetDraw}
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            数据不足或算法未生成预测
                          </p>
                        )}
                      </div>
                      {predictedNumbersForTargetDraw.length > 0 && (
                        <div className="text-xs space-y-0.5 text-foreground/90">
                          <p>
                            命中正码:{" "}
                            <span className="font-semibold">
                              {hitDetails.mainHitCount}
                            </span>{" "}
                            个
                            {hitDetails.matchedMainNumbers.length > 0
                              ? ` (${hitDetails.matchedMainNumbers.join(", ")})`
                              : ""}
                          </p>
                          <p>
                            特别号码 ({targetDraw.additionalNumber}):{" "}
                            {hitDetails.matchedAdditionalNumberDetails.matched ? (
                              <span className="font-semibold text-yellow-600">
                                命中
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                未命中
                              </span>
                            )}
                          </p>
                          <p>
                            正码命中率 (对比工具预测数量):{" "}
                            <span className="font-semibold">
                              {hitRate.toFixed(1)}%
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                无历史数据可供分析。
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    