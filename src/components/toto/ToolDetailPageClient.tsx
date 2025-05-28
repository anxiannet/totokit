
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
import { ArrowLeft, Target, Loader2, Save, AlertCircle, DatabaseZap, TrendingUp, TrendingDown, Info, BarChartBig, Wand2, PlayCircle, ListOrdered } from "lucide-react";
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
  saveCurrentDrawToolPrediction,
  saveHistoricalToolPredictions,
  type ToolPredictionInput,
  calculateSingleToolPrediction,
  calculateHistoricalPerformances,
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
  initialSavedPrediction: number[] | null; // Prediction for OFFICIAL_PREDICTIONS_DRAW_ID
  allHistoricalDataForPerformanceAnalysis: HistoricalResult[]; // All historical data from DB
}

export function ToolDetailPageClient({
  tool: serializableTool, // Renamed to avoid conflict with the tool variable inside the component if any
  initialSavedPrediction,
  allHistoricalDataForPerformanceAnalysis,
}: ToolDetailPageClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedPredictionForTargetDraw, setSavedPredictionForTargetDraw] = useState<number[] | null>(initialSavedPrediction);
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(false); // For fetching official pred (though initial is passed now)
  
  const [currentPredictionForSave, setCurrentPredictionForSave] = useState<number[] | null>(null); // For admin generated OFFICIAL_PREDICTIONS_DRAW_ID numbers
  const [displayedHistoricalPerformances, setDisplayedHistoricalPerformances] = useState<HistoricalPerformanceDisplayData[] | null>(null);

  const [isSavingCurrentDraw, setIsSavingCurrentDraw] = useState(false);
  const [isSavingHistorical, setIsSavingHistorical] = useState(false);
  const [isLoadingAllPredictions, setIsLoadingAllPredictions] = useState(false); // Unified loading for "Start Prediction"


  const isAdmin = user && user.email === "admin@totokit.com";

  const handleGenerateAllPredictions = async () => {
    if (!serializableTool || !allHistoricalDataForPerformanceAnalysis) {
      toast({ title: "提示", description: "没有足够的历史数据来生成预测。", variant: "default" });
      return;
    }
    setIsLoadingAllPredictions(true);
    setCurrentPredictionForSave(null);
    setDisplayedHistoricalPerformances(null);

    try {
      const latestTenHistoricalDataForCurrentPred = allHistoricalDataForPerformanceAnalysis.slice(0, 10);
      
      const [currentPredResult, historicalPerfResult] = await Promise.all([
        calculateSingleToolPrediction(serializableTool.id, latestTenHistoricalDataForCurrentPred),
        calculateHistoricalPerformances(serializableTool.id, allHistoricalDataForPerformanceAnalysis) // Pass full history
      ]);

      if (currentPredResult) {
        setCurrentPredictionForSave(currentPredResult);
      } else {
        toast({ title: `生成期号 ${OFFICIAL_PREDICTIONS_DRAW_ID} 预测失败`, description: `工具 ${serializableTool.name} 无法生成当前预测号码。`, variant: "destructive" });
      }

      if (historicalPerfResult && historicalPerfResult.length > 0) {
        setDisplayedHistoricalPerformances(historicalPerfResult);
      } else if (allHistoricalDataForPerformanceAnalysis.length >= 11) { // Ensure enough data for at least one backtest
        toast({ title: "无历史表现数据", description: `工具 ${serializableTool.name} 的历史表现无法计算，可能是因为工具未能针对历史期号生成有效预测。`, variant: "default"});
        setDisplayedHistoricalPerformances([]); // Set to empty array to indicate calculation was attempted
      } else {
         toast({ title: "历史数据不足", description: "数据库中历史开奖数据不足 (少于11期)，无法进行回测分析。", variant: "default"});
         setDisplayedHistoricalPerformances([]);
      }
      toast({ title: "成功", description: `已为工具 ${serializableTool.name} 完成全面预测生成！` });

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
        targetDrawDate: "PENDING_DRAW", // Or a more specific placeholder
        predictedNumbers: currentPredictionForSave,
        userId: user.uid, // Admin's UID
      };
      const result = await saveCurrentDrawToolPrediction(predictionData);

      if (result.success) {
        toast({ title: "成功", description: result.message || `预测已为期号 ${OFFICIAL_PREDICTIONS_DRAW_ID} 保存/更新。` });
        setSavedPredictionForTargetDraw(currentPredictionForSave); // Update displayed saved prediction
        setCurrentPredictionForSave(null); // Clear generated numbers after saving
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
    setIsSavingHistorical(true);
    try {
      const predictionsToSave: Array<Omit<ToolPredictionInput, 'toolId' | 'toolName' | 'userId'> & { userId: string }> = displayedHistoricalPerformances.map(performance => ({
        targetDrawNumber: performance.targetDraw.drawNumber,
        targetDrawDate: performance.targetDraw.date,
        predictedNumbers: performance.predictedNumbersForTargetDraw,
        userId: user.uid, // Admin's UID for each historical save, for rule consistency
      }));

      if (predictionsToSave.length > 0) {
        const result = await saveHistoricalToolPredictions(
            serializableTool.id,
            serializableTool.name,
            predictionsToSave,
            user.uid // Overall admin UID for the operation
        );
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
          {/* Admin: Unified Prediction Generation Button */}
          {isAdmin && (
            <div className="mb-6 pb-4 border-b">
              <Button onClick={handleGenerateAllPredictions} disabled={isLoadingAllPredictions} className="w-full">
                {isLoadingAllPredictions ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                )}
                开始全面预测 (当期及历史回测)
              </Button>
              {isLoadingAllPredictions && <p className="text-center text-sm text-muted-foreground mt-2">正在生成预测数据，请稍候...</p>}
            </div>
          )}

          {/* Section for Current/Official Draw Prediction (OFFICIAL_PREDICTIONS_DRAW_ID) */}
          <div className="mb-6 pb-6 border-b">
            <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
              <Target className="h-5 w-5 text-primary" />
              期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 预测号码:
            </h4>
            {isLoadingSavedPrediction ? ( // This state might be less relevant if initialSavedPrediction is passed directly
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>正在加载为期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 保存的预测...</p>
              </div>
            ) : savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-1">已保存的预测 (来自数据库):</p>
                <NumberPickingToolDisplay numbers={savedPredictionForTargetDraw} />
                {isAdmin && (
                     <Button onClick={handleSaveCurrentDrawPrediction} disabled={isSavingCurrentDraw || !currentPredictionForSave || currentPredictionForSave.length === 0} className="w-full mt-3">
                     {isSavingCurrentDraw ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Save className="mr-2 h-4 w-4" /> )}
                     更新期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 的预测
                   </Button>
                )}
              </>
            ) : null}
            
            {/* Admin: Display newly generated prediction for OFFICIAL_PREDICTIONS_DRAW_ID if not yet saved or if different */}
            {isAdmin && currentPredictionForSave && currentPredictionForSave.length > 0 && (
              <div className="mt-4 p-3 border rounded-md bg-muted/30">
                 <p className="text-xs text-muted-foreground mb-1">新生成的期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 预测 (可保存/更新):</p>
                <NumberPickingToolDisplay numbers={currentPredictionForSave} />
                <Button onClick={handleSaveCurrentDrawPrediction} disabled={isSavingCurrentDraw || !user?.uid} className="w-full mt-3">
                  {isSavingCurrentDraw ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Save className="mr-2 h-4 w-4" /> )}
                  保存期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 的预测
                </Button>
              </div>
            )}
            {!isAdmin && !savedPredictionForTargetDraw && !isLoadingSavedPrediction && !isLoadingAllPredictions && (
                 <Alert variant="default" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                      期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 的预测号码尚未由管理员生成或保存。
                    </AlertDescription>
                  </Alert>
            )}
          </div>
          
          {/* Section for Historical Performance */}
          {displayedHistoricalPerformances && !isLoadingAllPredictions && (
            <div className="pt-0">
                <h4 className="text-md font-semibold mb-3 flex items-center gap-1.5">
                  <ListOrdered className="h-5 w-5 text-primary" />
                  历史开奖动态预测表现:
                </h4>
                {displayedHistoricalPerformances.length > 0 ? (
                    <ScrollArea className="h-[calc(100vh-700px)] sm:h-[calc(100vh-650px)] rounded-md border p-3 space-y-4 bg-background/50">
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
                {isAdmin && displayedHistoricalPerformances && displayedHistoricalPerformances.length > 0 && (
                <div className="mt-6 pb-6 border-t pt-4">
                    <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
                    <DatabaseZap className="h-5 w-5 text-blue-600" />
                    管理员操作: 历史回测数据
                    </h4>
                    <Button onClick={handleSaveHistoricalBacktests} disabled={isSavingHistorical || !user?.uid } className="w-full">
                    {isSavingHistorical ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    保存全部历史回测预测到数据库
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                    此操作会将当前显示的 {displayedHistoricalPerformances ? displayedHistoricalPerformances.length : 0} 条历史回测预测结果（基于全部符合条件的历史数据）保存到数据库。
                    </p>
                </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
