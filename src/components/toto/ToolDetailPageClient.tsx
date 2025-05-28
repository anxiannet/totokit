
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
import { ArrowLeft, Target, Loader2, AlertCircle, DatabaseZap, ListOrdered, Save, PlayCircle, Info } from "lucide-react";
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
  calculateSingleToolPrediction,
  calculateHistoricalPerformances,
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
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(false); // For fetching official pred (not currently used for fetching, but for button state)

  const [currentPredictionForSave, setCurrentPredictionForSave] = useState<number[] | null>(null);
  const [displayedHistoricalPerformances, setDisplayedHistoricalPerformances] = useState<HistoricalPerformanceDisplayData[] | null>(null);
  const [isLoadingAllPredictions, setIsLoadingAllPredictions] = useState(false);


  const isAdmin = user && user.email === "admin@totokit.com";

  const handleGenerateAllPredictions = async () => {
    if (!serializableTool || !allHistoricalDataForPerformanceAnalysis || !user?.uid) {
      toast({ title: "错误", description: "无法生成预测，缺少必要信息或权限。", variant: "destructive" });
      return;
    }
    setIsLoadingAllPredictions(true);
    setCurrentPredictionForSave(null);
    setDisplayedHistoricalPerformances(null);

    try {
      toast({ title: "处理中", description: `正在为工具 ${serializableTool.name} 生成当期及历史回测预测...` });
      
      const latestTenHistoricalDataForCurrentPred = allHistoricalDataForPerformanceAnalysis.slice(0, 10);

      const [currentPredResult, historicalPerfResult] = await Promise.all([
        calculateSingleToolPrediction(serializableTool.id, latestTenHistoricalDataForCurrentPred),
        calculateHistoricalPerformances(serializableTool.id, allHistoricalDataForPerformanceAnalysis)
      ]);

      // Update display states immediately after generation
      if (currentPredResult) {
        setCurrentPredictionForSave(currentPredResult);
      } else {
        toast({ title: `生成期号 ${OFFICIAL_PREDICTIONS_DRAW_ID} 预测失败`, description: `工具 ${serializableTool.name} 无法生成当前预测号码。`, variant: "default" });
      }

      if (historicalPerfResult) {
        setDisplayedHistoricalPerformances(historicalPerfResult);
      } else {
         // This case should ideally not happen if calculateHistoricalPerformances always returns an array
        setDisplayedHistoricalPerformances([]); 
      }
      
      toast({ title: "生成完毕", description: `已为工具 ${serializableTool.name} 完成全面预测生成，正在尝试保存...` });

      // Now attempt to save
      let currentSaveSuccess = false;
      let historicalSaveSuccess = false;
      const adminUserId = user.uid;

      if (currentPredResult && currentPredResult.length > 0) {
        const currentPredictionData: ToolPredictionInput = {
          toolId: serializableTool.id,
          toolName: serializableTool.name,
          targetDrawNumber: OFFICIAL_PREDICTIONS_DRAW_ID,
          targetDrawDate: "PENDING_DRAW",
          predictedNumbers: currentPredResult,
          userId: adminUserId,
        };
        try {
          const saveCurrentResult = await saveCurrentDrawToolPrediction(currentPredictionData);
          if (saveCurrentResult.success) {
            toast({ title: "当期预测已保存", description: saveCurrentResult.message || `期号 ${OFFICIAL_PREDICTIONS_DRAW_ID} 的预测已成功保存/更新。` });
            setSavedPredictionForTargetDraw(currentPredResult); // Update displayed saved prediction
            currentSaveSuccess = true;
          } else {
            toast({ title: "当期预测保存失败", description: saveCurrentResult.message || "无法保存当期预测。", variant: "destructive" });
          }
        } catch (error: any) {
           toast({ title: "当期预测保存出错", description: error.message || "保存当期预测时发生错误。", variant: "destructive" });
        }
      }

      if (historicalPerfResult && historicalPerfResult.length > 0) {
        const predictionsToSaveForDb: ToolPredictionInput[] = historicalPerfResult.map(hp => ({
          toolId: serializableTool.id,
          toolName: serializableTool.name,
          targetDrawNumber: hp.targetDraw.drawNumber,
          targetDrawDate: hp.targetDraw.date,
          predictedNumbers: hp.predictedNumbersForTargetDraw,
          userId: adminUserId,
        }));

        if (predictionsToSaveForDb.length > 0) {
          try {
            const saveHistoricalResult = await saveHistoricalToolPredictions(predictionsToSaveForDb, adminUserId);
            if (saveHistoricalResult.success) {
              toast({ title: "历史回测已保存", description: saveHistoricalResult.message || `已成功保存/更新 ${saveHistoricalResult.savedCount || 0} 条历史回测预测。` });
              historicalSaveSuccess = true;
            } else {
              toast({ title: "历史回测保存失败", description: saveHistoricalResult.message || "无法批量保存历史回测预测。", variant: "destructive" });
            }
          } catch (error: any) {
            toast({ title: "历史回测保存出错", description: error.message || "批量保存历史回测预测时发生错误。", variant: "destructive" });
          }
        }
      }
      
      if(currentSaveSuccess || historicalSaveSuccess){
        toast({title: "操作完成", description: "预测数据生成和保存操作已完成。"});
      } else if (!currentPredResult && (!historicalPerfResult || historicalPerfResult.length === 0)) {
        // No data was generated to begin with, handled by earlier toasts.
      } else {
        toast({title: "保存操作未完全成功", description: "部分或全部预测数据未能成功保存到数据库。", variant: "default"});
      }

    } catch (error: any) {
      toast({ title: "预测生成或保存出错", description: error.message || "处理预测时发生未知错误。", variant: "destructive" });
    } finally {
      setIsLoadingAllPredictions(false);
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

  const shouldShowAdminActions = isAdmin && allHistoricalDataForPerformanceAnalysis && allHistoricalDataForPerformanceAnalysis.length > 0;

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
          {/* Admin: Unified Prediction Generation and Save Button */}
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
              {isLoadingAllPredictions && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  正在生成及保存预测数据... 请稍候...
                </p>
              )}
            </div>
          )}

          {/* Section for Current/Official Draw Prediction (OFFICIAL_PREDICTIONS_DRAW_ID) */}
          <div className="mb-6 pb-6 border-b">
            <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
              <Target className="h-5 w-5 text-primary" />
              期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 预测号码:
            </h4>
            {isLoadingAllPredictions && !savedPredictionForTargetDraw && !currentPredictionForSave && (
                <div className="flex items-center space-x-2 mt-1">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">等待生成...</p>
                </div>
            )}
            {savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-1">已保存的预测 (来自数据库):</p>
                <NumberPickingToolDisplay numbers={savedPredictionForTargetDraw} />
              </>
            )}
            {currentPredictionForSave && currentPredictionForSave.length > 0 && !savedPredictionForTargetDraw &&(
              <>
                <p className="text-xs text-muted-foreground mb-1">新生成的预测 (点击上方按钮后已自动尝试保存):</p>
                <NumberPickingToolDisplay numbers={currentPredictionForSave} />
              </>
            )}
            {!isLoadingAllPredictions && !savedPredictionForTargetDraw && !currentPredictionForSave && (
                 <Alert variant="default" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                    期号 {OFFICIAL_PREDICTIONS_DRAW_ID} 的预测号码尚未生成或保存。
                    {isAdmin && " 请点击上方的“开始全面预测”按钮生成并保存。"}
                    </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Section for Historical Performance */}
          {(isLoadingAllPredictions || displayedHistoricalPerformances !== null) && (
             <div className="pt-0">
                <h4 className="text-md font-semibold mb-3 flex items-center gap-1.5">
                  <ListOrdered className="h-5 w-5 text-primary" />
                  历史开奖动态预测表现:
                </h4>
                {isLoadingAllPredictions && !displayedHistoricalPerformances && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">正在加载历史表现数据...</p>
                  </div>
                )}
                {displayedHistoricalPerformances && displayedHistoricalPerformances.length > 0 && (
                    <ScrollArea className="h-[500px] rounded-md border p-3 space-y-4 bg-background/50">
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
                )}
                {displayedHistoricalPerformances && displayedHistoricalPerformances.length === 0 && !isLoadingAllPredictions && (
                    <Alert variant="default" className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertTitle>无历史表现数据</AlertTitle>
                        <AlertDescription>
                        未能计算历史表现，可能是数据库中开奖数据不足 (少于11期) 或工具未生成预测。
                        </AlertDescription>
                    </Alert>
                   )
                }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
