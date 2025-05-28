
// src/components/toto/ToolDetailPageClient.tsx
"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
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
import { ArrowLeft, Target, Loader2, Save, AlertCircle, DatabaseZap, TrendingUp, TrendingDown, Info, BarChartBig, Eye } from "lucide-react";
import type { HistoricalResult, TotoCombination } from "@/lib/types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";
import { NumberPickingToolDisplay } from "@/components/toto/NumberPickingToolDisplay";
import { FavoriteStarButton } from "@/components/toto/FavoriteStarButton";
import {
  getBallColor as getOfficialBallColor,
  formatDateToLocale,
  type HitDetails,
} from "@/lib/totoUtils";
import { zhCN } from "date-fns/locale";
import {
  saveToolPrediction,
  saveMultipleToolPredictions,
  calculateHistoricalPerformances,
  getPredictionForToolAndDraw,
  type ToolPredictionInput,
} from "@/lib/actions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SerializableTool {
  id: string;
  name: string;
  description: string;
}

export interface HistoricalPerformanceDisplayData {
  targetDraw: HistoricalResult;
  predictedNumbersForTargetDraw: number[];
  hitDetails: HitDetails;
  hitRate: number;
  hasAnyHit: boolean;
  predictionBasisDraws: string | null;
}

interface ToolDetailPageClientProps {
  tool: SerializableTool;
  initialSavedPrediction: number[] | null;
  dynamicallyGeneratedCurrentPrediction: number[];
  allHistoricalDataForPerformanceAnalysis: HistoricalResult[];
}

export function ToolDetailPageClient({
  tool: serializableTool,
  initialSavedPrediction,
  dynamicallyGeneratedCurrentPrediction,
  allHistoricalDataForPerformanceAnalysis,
}: ToolDetailPageClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedPredictionForTargetDraw, setSavedPredictionForTargetDraw] = useState<number[] | null>(initialSavedPrediction);
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(false); // For fetching official pred
  const [isSavingCurrentDraw, setIsSavingCurrentDraw] = useState(false);
  
  const [displayedHistoricalPerformances, setDisplayedHistoricalPerformances] = useState<HistoricalPerformanceDisplayData[] | null>(null);
  const [isLoadingHistoricalPerformance, setIsLoadingHistoricalPerformance] = useState(false);
  const [isSavingHistoricalBacktests, setIsSavingHistoricalBacktests] = useState(false);

  const isAdmin = user && user.email === "admin@totokit.com";

  const fetchAndSetSavedOfficialPrediction = useCallback(async () => {
    if (!serializableTool) return;
    setIsLoadingSavedPrediction(true);
    try {
      const saved = await getPredictionForToolAndDraw(serializableTool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
      setSavedPredictionForTargetDraw(saved);
    } catch (error) {
      console.error(`Error fetching saved prediction for tool ${serializableTool.id}, draw ${OFFICIAL_PREDICTIONS_DRAW_ID}:`, error);
      setSavedPredictionForTargetDraw(null);
      toast({ title: "错误", description: "加载为当期保存的预测失败。", variant: "destructive" });
    } finally {
      setIsLoadingSavedPrediction(false);
    }
  }, [serializableTool, toast]);

  useEffect(() => {
     fetchAndSetSavedOfficialPrediction();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializableTool?.id]); 

  const handleSaveCurrentDrawPrediction = async () => {
    if (!serializableTool || !isAdmin || !user?.uid) {
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
        toolId: serializableTool.id,
        toolName: serializableTool.name,
        targetDrawNumber: OFFICIAL_PREDICTIONS_DRAW_ID,
        targetDrawDate: "PENDING_DRAW", 
        predictedNumbers: dynamicallyGeneratedCurrentPrediction,
        userId: user.uid,
      };
      const result = await saveToolPrediction(predictionData);

      if (result.success) {
        toast({ title: "成功", description: result.message || `预测已为第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期保存/更新。` });
        fetchAndSetSavedOfficialPrediction(); 
      } else {
        toast({ title: "保存失败", description: result.message || "无法保存预测。", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "保存出错", description: error.message || "保存预测时发生错误。", variant: "destructive" });
    } finally {
      setIsSavingCurrentDraw(false);
    }
  };

  const handleLoadHistoricalPerformance = async () => {
    if (!serializableTool || !allHistoricalDataForPerformanceAnalysis) return;
    setIsLoadingHistoricalPerformance(true);
    try {
      const performances = await calculateHistoricalPerformances(serializableTool.id, allHistoricalDataForPerformanceAnalysis);
      setDisplayedHistoricalPerformances(performances);
      if (performances.length === 0 && allHistoricalDataForPerformanceAnalysis.length > 0) {
        toast({ title: "提示", description: "无法计算历史表现，可能是历史数据不足10期。", variant: "default"});
      } else if (allHistoricalDataForPerformanceAnalysis.length === 0) {
         toast({ title: "无数据", description: "数据库中没有历史开奖数据可供分析。", variant: "default"});
      }
    } catch (error: any) {
      toast({ title: "错误", description: `加载历史表现数据失败: ${error.message || "未知错误"}`, variant: "destructive" });
      setDisplayedHistoricalPerformances(null);
    } finally {
      setIsLoadingHistoricalPerformance(false);
    }
  };

  const handleSaveHistoricalBacktests = async () => {
    if (!serializableTool || !isAdmin || !user?.uid || !displayedHistoricalPerformances || displayedHistoricalPerformances.length === 0) {
      toast({ title: "错误", description: "没有可保存的历史回测数据，或权限不足。", variant: "destructive" });
      return;
    }
    setIsSavingHistoricalBacktests(true);
    try {
      const predictionsToSave: ToolPredictionInput[] = displayedHistoricalPerformances.map(performance => ({
        toolId: serializableTool.id,
        toolName: serializableTool.name,
        targetDrawNumber: performance.targetDraw.drawNumber,
        targetDrawDate: performance.targetDraw.date,
        predictedNumbers: performance.predictedNumbersForTargetDraw,
        userId: user.uid, 
      }));

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
      setIsSavingHistoricalBacktests(false);
    }
  };


  const OfficialDrawDisplay = ({ draw }: { draw: HistoricalResult }) => (
    <div className="flex flex-wrap gap-1.5 items-center">
      {draw.numbers.map((num) => (
        <Badge
          key={`official-${draw.drawNumber}-main-${num}`}
          className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(num, false)}`}
        >
          {num}
        </Badge>
      ))}
      <span className="mx-1 text-muted-foreground">+</span>
      <Badge
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shadow-sm ${getOfficialBallColor(draw.additionalNumber, true)}`}
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
      currentDrawSectionTitle = `为第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期动态生成号码 (可保存):`;
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
              {serializableTool.name}
            </CardTitle>
            { user && <FavoriteStarButton toolId={serializableTool.id} toolName={serializableTool.name} />}
          </div>
          <CardDescription>{serializableTool.description}</CardDescription>
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
                {isAdmin && !showAdminSaveCurrentDrawButton 
                  ? "当前动态算法未生成号码。"
                  : `第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期预测号码尚未由管理员生成或保存。`}
              </p>
            )}

            {isAdmin && showAdminSaveCurrentDrawButton && (dynamicallyGeneratedCurrentPrediction.length > 0 || (savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0)) && (
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
                    本工具对第 {OFFICIAL_PREDICTIONS_DRAW_ID} 期的预测号码尚未生成。
                    </AlertDescription>
                </Alert>
            )}
          </div>

          <div className="pt-0">
            {isLoadingHistoricalPerformance ? (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">正在计算历史表现...</p>
              </div>
            ) : displayedHistoricalPerformances === null ? (
              allHistoricalDataForPerformanceAnalysis && allHistoricalDataForPerformanceAnalysis.length > 0 ? (
                 <Button onClick={handleLoadHistoricalPerformance} variant="outline" className="w-full mb-3">
                   <Eye className="mr-2 h-4 w-4" />
                   显示/刷新历史表现数据
                 </Button>
              ) : (
                <Alert variant="default" className="mt-3">
                    <Info className="h-4 w-4" />
                    <AlertTitle>无历史数据</AlertTitle>
                    <AlertDescription>
                        数据库中没有历史开奖数据可供分析。请先通过管理员页面同步。
                    </AlertDescription>
                </Alert>
              )
            ) : (
              <>
                <h4 className="text-md font-semibold mb-3 flex items-center gap-1.5">
                  <BarChartBig className="h-5 w-5 text-primary" />
                  历史开奖动态预测表现 (最近10期):
                </h4>
                {displayedHistoricalPerformances.length > 0 ? (
                  <ScrollArea className="h-[calc(100vh-600px)] rounded-md border p-3 space-y-4 bg-background/50">
                    {displayedHistoricalPerformances.map((performance) => {
                      if (!performance) return null;
                      const { targetDraw, predictedNumbersForTargetDraw, hitDetails, hitRate, hasAnyHit, predictionBasisDraws } = performance;
                      return (
                        <div
                          key={`${serializableTool.id}-${targetDraw.drawNumber}`}
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
                           {predictionBasisDraws && (
                                <p className="text-xs text-muted-foreground italic mb-1">
                                    {predictionBasisDraws}
                                </p>
                            )}
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
                  <Alert variant="default" className="mt-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>无历史表现数据</AlertTitle>
                      <AlertDescription>
                        未能计算历史表现，可能是数据库中开奖数据不足或工具未生成预测。
                      </AlertDescription>
                  </Alert>
                )}
              </>
            )}
            
            {isAdmin && displayedHistoricalPerformances && displayedHistoricalPerformances.length > 0 && (
              <div className="mt-6 pb-6 border-t pt-4">
                <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
                  <DatabaseZap className="h-5 w-5 text-blue-600" />
                  管理员操作: 历史回测数据
                </h4>
                <Button onClick={handleSaveHistoricalBacktests} disabled={isSavingHistoricalBacktests || !user?.uid } className="w-full">
                  {isSavingHistoricalBacktests ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  保存全部历史回测预测到数据库
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  此操作会将当前显示的 {displayedHistoricalPerformances ? displayedHistoricalPerformances.length : 0} 条历史回测预测结果保存到数据库。
                </p>
              </div>
            )}
            {isAdmin && !displayedHistoricalPerformances && allHistoricalDataForPerformanceAnalysis && allHistoricalDataForPerformanceAnalysis.length > 0 && (
                 <div className="mt-6 pb-6 border-t pt-4">
                     <Alert variant="default">
                         <Info className="h-4 w-4" />
                         <AlertTitle>提示</AlertTitle>
                         <AlertDescription>
                             请先点击“显示/刷新历史表现数据”按钮加载回测数据，然后才能将其保存到数据库。
                         </AlertDescription>
                     </Alert>
                 </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
