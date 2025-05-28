
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
import { ArrowLeft, Target, Loader2, Save, AlertCircle, DatabaseZap, TrendingUp, TrendingDown, Info, BarChartBig, Eye, Wand2, PlayCircle } from "lucide-react";
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
  getPredictionForToolAndDraw,
  calculateHistoricalPerformances,
  calculateSingleToolPrediction,
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
  allHistoricalDataForPerformanceAnalysis: HistoricalResult[];
}

export function ToolDetailPageClient({
  tool: serializableTool,
  initialSavedPrediction,
  allHistoricalDataForPerformanceAnalysis,
}: ToolDetailPageClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedPredictionForTargetDraw, setSavedPredictionForTargetDraw] = useState<number[] | null>(initialSavedPrediction);
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(false);
  const [isSavingCurrentDraw, setIsSavingCurrentDraw] = useState(false);

  const [displayedHistoricalPerformances, setDisplayedHistoricalPerformances] = useState<HistoricalPerformanceDisplayData[] | null>(null);
  const [isSavingHistoricalBacktests, setIsSavingHistoricalBacktests] = useState(false);

  const [currentPredictionForSave, setCurrentPredictionForSave] = useState<number[] | null>(null);
  const [isLoadingAllPredictions, setIsLoadingAllPredictions] = useState(false);


  const isAdmin = user && user.email === "admin@totokit.com";

  const fetchAndSetSavedOfficialPrediction = useCallback(async () => {
    if (!serializableTool) return;
    setIsLoadingSavedPrediction(true);
    try {
      const saved = await getPredictionForToolAndDraw(serializableTool.id, OFFICIAL_PREDICTIONS_DRAW_ID);
      setSavedPredictionForTargetDraw(saved);
    } catch (error) {
      console.error(`Error fetching saved prediction for tool ${serializableTool.id}, draw ${OFFICIAL_PREDICTIONS_DRAW_ID}:`, error);
      setSavedPredictionForTargetDraw(null); // Ensure it's reset on error
      toast({ title: "错误", description: "加载为当期保存的预测失败。", variant: "destructive" });
    } finally {
      setIsLoadingSavedPrediction(false);
    }
  }, [serializableTool, toast]);

  useEffect(() => {
    fetchAndSetSavedOfficialPrediction();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializableTool?.id]);


  const handleGenerateAllPredictions = async () => {
    if (!serializableTool || !allHistoricalDataForPerformanceAnalysis) {
      toast({ title: "提示", description: "没有足够的历史数据来生成预测。", variant: "default" });
      return;
    }
    setIsLoadingAllPredictions(true);
    setCurrentPredictionForSave(null);
    setDisplayedHistoricalPerformances(null);

    try {
      const latestTenHistoricalData = allHistoricalDataForPerformanceAnalysis.slice(0, 10);
      
      const [currentPred, historicalPerf] = await Promise.all([
        calculateSingleToolPrediction(serializableTool.id, latestTenHistoricalData),
        calculateHistoricalPerformances(serializableTool.id, allHistoricalDataForPerformanceAnalysis)
      ]);

      if (currentPred) {
        setCurrentPredictionForSave(currentPred);
      } else {
        toast({ title: "生成当期预测失败", description: "无法生成当前预测号码。", variant: "destructive" });
      }

      if (historicalPerf && historicalPerf.length > 0) {
        setDisplayedHistoricalPerformances(historicalPerf);
      } else if (allHistoricalDataForPerformanceAnalysis.length > 0) {
        toast({ title: "无历史表现数据", description: "无法计算历史表现，可能是历史数据不足或工具未生成预测。", variant: "default"});
        setDisplayedHistoricalPerformances([]); // Set to empty array to indicate calculation was attempted
      } else {
         toast({ title: "无历史数据", description: "数据库中没有历史开奖数据可供分析。", variant: "default"});
         setDisplayedHistoricalPerformances([]);
      }
      toast({ title: "成功", description: "已完成全面预测生成！" });

    } catch (error: any) {
      toast({ title: "预测生成出错", description: error.message || "生成预测时发生错误。", variant: "destructive" });
    } finally {
      setIsLoadingAllPredictions(false);
    }
  };


  const handleSaveCurrentDrawPrediction = async () => {
    if (!serializableTool || !isAdmin || !user?.uid) {
      toast({ title: "错误", description: "只有管理员才能保存预测。", variant: "destructive" });
      return;
    }
    if (!currentPredictionForSave || currentPredictionForSave.length === 0) {
      toast({ title: "提示", description: "没有可保存的当期预测号码。请先生成。", variant: "default" });
      return;
    }
    setIsSavingCurrentDraw(true);
    try {
      const predictionData: ToolPredictionInput = {
        toolId: serializableTool.id,
        toolName: serializableTool.name,
        targetDrawNumber: OFFICIAL_PREDICTIONS_DRAW_ID,
        targetDrawDate: "PENDING_DRAW",
        predictedNumbers: currentPredictionForSave,
        userId: user.uid,
      };
      const result = await saveToolPrediction(predictionData);

      if (result.success) {
        toast({ title: "成功", description: result.message || `预测已为第 ${OFFICIAL_PREDICTIONS_DRAW_ID} 期保存/更新。` });
        fetchAndSetSavedOfficialPrediction(); // Refresh the displayed saved prediction
        setCurrentPredictionForSave(null); // Clear generated numbers after saving if desired
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
            {user && <FavoriteStarButton toolId={serializableTool.id} toolName={serializableTool.name} />}
          </div>
          <CardDescription>{serializableTool.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Section for Current Draw Prediction (OFFICIAL_PREDICTIONS_DRAW_ID) */}
          <div className="mb-6 pb-6 border-b">
            <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
              <Target className="h-5 w-5 text-primary" />
              期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 预测号码:
            </h4>
            {isLoadingSavedPrediction ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>正在加载为期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 保存的预测...</p>
              </div>
            ) : savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-1">已保存的预测 (来自数据库):</p>
                <NumberPickingToolDisplay numbers={savedPredictionForTargetDraw} />
              </>
            ) : !isAdmin ? (
               <Alert variant="default" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>提示</AlertTitle>
                  <AlertDescription>
                    期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 的预测号码尚未由管理员生成。
                  </AlertDescription>
                </Alert>
            ) : null }

            {isAdmin && (!savedPredictionForTargetDraw || savedPredictionForTargetDraw.length === 0) && !currentPredictionForSave && (
              <Button onClick={handleGenerateAllPredictions} disabled={isLoadingAllPredictions} className="w-full mt-3">
                {isLoadingAllPredictions ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <PlayCircle className="mr-2 h-4 w-4" /> )}
                开始全面预测 (当期及历史回测)
              </Button>
            )}
            
            {isAdmin && currentPredictionForSave && currentPredictionForSave.length > 0 && (
              <div className="mt-4 p-3 border rounded-md bg-muted/30">
                 <p className="text-xs text-muted-foreground mb-1">新生成的当期预测 (可保存):</p>
                <NumberPickingToolDisplay numbers={currentPredictionForSave} />
                <Button onClick={handleSaveCurrentDrawPrediction} disabled={isSavingCurrentDraw || isLoadingAllPredictions || !user?.uid} className="w-full mt-3">
                  {isSavingCurrentDraw ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Save className="mr-2 h-4 w-4" /> )}
                  保存期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 的预测
                </Button>
              </div>
            )}
             {/* Show this if prediction already saved and admin wants to regenerate/update */}
            {isAdmin && savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 && (
                 <Button onClick={handleGenerateAllPredictions} disabled={isLoadingAllPredictions} className="w-full mt-3">
                    {isLoadingAllPredictions ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <PlayCircle className="mr-2 h-4 w-4" /> )}
                    重新生成全面预测 (覆盖已保存的当期预测)
                </Button>
            )}
          </div>

          {/* Section for Historical Performance */}
          <div className="pt-0">
            {isLoadingAllPredictions && (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">正在生成全面预测数据...</p>
              </div>
            )}

            {displayedHistoricalPerformances && displayedHistoricalPerformances.length > 0 && !isLoadingAllPredictions && (
              <>
                <h4 className="text-md font-semibold mb-3 flex items-center gap-1.5">
                  <BarChartBig className="h-5 w-5 text-primary" />
                  历史开奖动态预测表现 (最近10期):
                </h4>
                <ScrollArea className="h-[calc(100vh-650px)] sm:h-[calc(100vh-600px)] rounded-md border p-3 space-y-4 bg-background/50">
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
              </>
            )}
            {displayedHistoricalPerformances && displayedHistoricalPerformances.length === 0 && !isLoadingAllPredictions && (
                 <Alert variant="default" className="mt-3">
                    <Info className="h-4 w-4" />
                    <AlertTitle>无历史表现数据</AlertTitle>
                    <AlertDescription>
                      未能计算历史表现，可能是数据库中开奖数据不足或工具未生成预测。
                    </AlertDescription>
                </Alert>
            )}
            
            {isAdmin && displayedHistoricalPerformances && displayedHistoricalPerformances.length > 0 && !isLoadingAllPredictions &&(
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    