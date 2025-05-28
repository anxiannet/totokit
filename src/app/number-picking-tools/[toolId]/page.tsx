"use client"; // Required for useAuth, useState, useEffect, use, toast

import Link from "next/link";
import { useEffect, useState, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Target, Loader2, Save, AlertCircle, DatabaseZap } from "lucide-react";
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
  saveMultipleToolPredictions,
} from "@/lib/actions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SingleNumberToolPage({
  params,
}: {
  params: { toolId: string };
}) {
  const resolvedParams = use(params);
  const { toolId } = resolvedParams;

  const tool = dynamicTools.find((t) => t.id === toolId);
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedPredictionForTargetDraw, setSavedPredictionForTargetDraw] = useState<number[] | null>(null);
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(true);
  const [isSavingCurrentDraw, setIsSavingCurrentDraw] = useState(false);
  const [isSavingHistorical, setIsSavingHistorical] = useState(false);
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

  const handleSaveCurrentDrawPrediction = async () => {
    if (!tool || !isAdmin || !user?.uid) {
      toast({ title: "错误", description: "只有管理员才能保存预测。", variant: "destructive" });
      return;
    }
    if (!dynamicallyGeneratedCurrentPrediction || dynamicallyGeneratedCurrentPrediction.length === 0) {
      toast({ title: "提示", description: "没有可保存的动态生成号码。", variant: "default" });
      return;
    }
    setIsSavingCurrentDraw(true);
    try {
      const predictionData: ToolPredictionInput = {
        toolId: tool.id,
        toolName: tool.name,
        targetDrawNumber: OFFICIAL_PREDICTIONS_DRAW_ID,
        targetDrawDate: "PENDING_DRAW",
        predictedNumbers: dynamicallyGeneratedCurrentPrediction,
        userId: user.uid,
      };
      const result = await saveToolPrediction(predictionData);

      if (result.success) {
        toast({ title: "成功", description: result.message || `预测已为第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期保存/更新。` });
        fetchAndSetSavedPrediction(); 
      } else {
        toast({ title: "保存失败", description: result.message || "无法保存预测。", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "保存出错", description: error.message || "保存预测时发生错误。", variant: "destructive" });
    } finally {
      setIsSavingCurrentDraw(false);
    }
  };

  const handleSaveHistoricalBacktests = async () => {
    if (!tool || !isAdmin || !user?.uid) {
      toast({ title: "错误", description: "只有管理员才能执行此操作。", variant: "destructive" });
      return;
    }
    setIsSavingHistorical(true);
    try {
      const allHistoricalData: HistoricalResult[] = MOCK_HISTORICAL_DATA;
      const predictionsToSave: ToolPredictionInput[] = [];

      allHistoricalData.forEach((targetDraw, originalIndex) => {
        // Check if there are 10 preceding draws
        // The 10 preceding draws are from index `originalIndex + 1` to `originalIndex + 10`
        // So, we need `originalIndex + 10` to be a valid index within `allHistoricalData`
        if (originalIndex + 10 < allHistoricalData.length) {
          const precedingTenDraws = allHistoricalData.slice(originalIndex + 1, originalIndex + 1 + 10);
          
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
              userId: user.uid,
            });
          }
        }
      });

      if (predictionsToSave.length > 0) {
        const result = await saveMultipleToolPredictions(predictionsToSave, user.uid);
        if (result.success) {
          toast({ title: "成功", description: result.message || `已成功保存/更新 ${result.savedCount || 0} 条历史回测预测。` });
        } else {
          toast({ title: "保存失败", description: result.message || "无法批量保存历史回测预测。", variant: "destructive" });
        }
      } else {
        toast({ title: "无数据", description: "没有符合条件的可保存的历史回测预测数据。", variant: "default" });
      }
    } catch (error: any) {
      toast({ title: "保存出错", description: error.message || "批量保存历史回测预测时发生错误。", variant: "destructive" });
    } finally {
      setIsSavingHistorical(false);
    }
  };


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

  // For displaying historical performance, we still use the latest 10 draws in the UI
  const allHistoricalDataForDisplay: HistoricalResult[] = MOCK_HISTORICAL_DATA;
  const recentTenHistoricalDrawsForDisplay: HistoricalResult[] = allHistoricalDataForDisplay.slice(0, 10);

  const historicalPerformancesToDisplay = recentTenHistoricalDrawsForDisplay.map((targetDraw) => {
    const originalIndex = allHistoricalDataForDisplay.findIndex(d => d.drawNumber === targetDraw.drawNumber);
    if (originalIndex === -1) return null;

    const precedingDrawsStartIndex = originalIndex + 1;
    const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
    
    // Ensure we have 10 preceding draws for dynamic prediction
    if (precedingDrawsEndIndex > allHistoricalDataForDisplay.length) return null; 
    
    const precedingTenDraws = allHistoricalDataForDisplay.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

    let predictedNumbersForTargetDraw: number[] = [];
    if (tool.algorithmFn) {
        predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
    }

    const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
        ? (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, TOTO_NUMBER_RANGE.max)) * 100 // Max is 6 for main numbers of a standard ticket
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
  let showAdminSaveCurrentDrawButton = false;

  if (isLoadingSavedPrediction) {
    // Loader shown below
  } else if (savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0) {
    displayNumbersForCurrentDrawSection = savedPredictionForTargetDraw;
    currentDrawSectionTitle = `第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测号码 (来自数据库):`;
    if (isAdmin) { 
      showAdminSaveCurrentDrawButton = true;
    }
  } else {
    if (isAdmin) {
      displayNumbersForCurrentDrawSection = dynamicallyGeneratedCurrentPrediction;
      currentDrawSectionTitle = `当前动态生成号码 (可保存为第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测):`;
      showAdminSaveCurrentDrawButton = true;
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
                {isAdmin && !showAdminSaveCurrentDrawButton ? "当前算法未生成号码。" : `第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测号码尚未由管理员生成。`}
              </p>
            )}

            {isAdmin && showAdminSaveCurrentDrawButton && dynamicallyGeneratedCurrentPrediction.length > 0 && (
              <Button onClick={handleSaveCurrentDrawPrediction} disabled={isSavingCurrentDraw || !user?.uid} className="w-full mt-3">
                {isSavingCurrentDraw ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 ? `更新` : `保存`}第 {OFFICIAL_PREDICTIONS_DRAW_ID} 期预测
              </Button>
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

          {isAdmin && (
            <div className="mb-6 pb-6 border-b">
              <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
                <DatabaseZap className="h-5 w-5 text-blue-600" />
                管理员操作: 历史回测数据
              </h4>
              <Button onClick={handleSaveHistoricalBacktests} disabled={isSavingHistorical || !user?.uid} className="w-full">
                {isSavingHistorical ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存全部历史回测预测到数据库
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                此操作会将本工具对所有符合条件的历史开奖的动态预测结果保存到数据库（每期预测基于其前10期数据）。
              </p>
            </div>
          )}


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

export function generateStaticParams() {
  return dynamicTools.map((tool) => ({
    toolId: tool.id,
  }));
}

