
"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, use } from "react"; // Added 'use'
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, Loader2, AlertCircle, ListOrdered, Info, Database, Save, RefreshCw, TrendingUp, TrendingDown, PlayCircle } from "lucide-react";
import type { HistoricalResult, TotoCombination, ToolPredictionInput, HistoricalPerformanceDisplayData as HistoricalPerformanceDataType } from "@/lib/types";
// Renamed imported type to avoid conflict with local interface
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
} from "@/lib/actions";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export interface HistoricalPerformanceDisplayData extends HistoricalPerformanceDataType {
  // This interface can extend the one from types.ts if needed, or be standalone
  // For now, assuming HistoricalPerformanceDataType from types.ts is sufficient
}

interface SerializableTool {
  id: string;
  name: string;
  description: string;
}

interface ToolDetailPageClientProps {
  tool: SerializableTool;
  initialSavedPrediction: number[] | null;
  allHistoricalDataForPerformanceAnalysis: HistoricalResult[];
  initialHistoricalPerformances: HistoricalPerformanceDisplayData[] | null;
  officialDrawId: string; // New prop
}


export function ToolDetailPageClient({
  tool: serializableTool,
  initialSavedPrediction,
  allHistoricalDataForPerformanceAnalysis,
  initialHistoricalPerformances,
  officialDrawId, // Destructure new prop
}: ToolDetailPageClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedPredictionForTargetDraw, setSavedPredictionForTargetDraw] = useState<number[] | null>(initialSavedPrediction);
  const [isLoadingSavedPrediction, setIsLoadingSavedPrediction] = useState(false); // For fetching official pred (server does this now)

  const [currentPredictionForSave, setCurrentPredictionForSave] = useState<number[] | null>(null);
  const [isGeneratingCurrentPrediction, setIsGeneratingCurrentPrediction] = useState(false);

  const [displayedHistoricalPerformances, setDisplayedHistoricalPerformances] = useState<HistoricalPerformanceDisplayData[] | null>(initialHistoricalPerformances);
  const [isLoadingHistoricalPerformance, setIsLoadingHistoricalPerformance] = useState(false);


  const [isSavingCurrentDraw, setIsSavingCurrentDraw] = useState(false);
  const [isSavingHistorical, setIsSavingHistorical] = useState(false);
  const [isLoadingAllPredictions, setIsLoadingAllPredictions] = useState(false);


  const isAdmin = user && user.email === "admin@totokit.com";
  const adminUserId = user?.uid;


  useEffect(() => {
    setSavedPredictionForTargetDraw(initialSavedPrediction);
  }, [initialSavedPrediction]);
  
  useEffect(() => {
     if (initialHistoricalPerformances) {
        setDisplayedHistoricalPerformances(initialHistoricalPerformances);
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHistoricalPerformances]);


  const handleGenerateAllPredictions = async () => {
    if (!isAdmin || !adminUserId || !allHistoricalDataForPerformanceAnalysis || allHistoricalDataForPerformanceAnalysis.length === 0) {
      toast({ title: "操作无效", description: "条件不足，无法执行预测。", variant: "destructive" });
      return;
    }
    setIsLoadingAllPredictions(true);
    setCurrentPredictionForSave(null); // Clear previous generated one
    setDisplayedHistoricalPerformances(null); // Clear previous historical ones
    toast({ title: "处理中", description: `正在为工具 ${serializableTool.name} 生成当期及历史回测预测...` });

    try {
      const latestTenHistoricalDataForCurrentPred = allHistoricalDataForPerformanceAnalysis.slice(0, 10);
      
      const [currentPredResult, historicalPerfResult] = await Promise.all([
        calculateSingleToolPrediction(serializableTool.id, latestTenHistoricalDataForCurrentPred),
        calculateHistoricalPerformances(serializableTool.id, allHistoricalDataForPerformanceAnalysis)
      ]);

      if (currentPredResult) {
        setCurrentPredictionForSave(currentPredResult);
      } else {
        toast({title: "当期预测失败", description: `工具 ${serializableTool.name} 未能生成当期预测。`, variant: "destructive"});
      }

      if (historicalPerfResult) {
        setDisplayedHistoricalPerformances(historicalPerfResult);
      } else {
         toast({title: "历史回测失败", description: `工具 ${serializableTool.name} 未能生成历史回测数据。`, variant: "destructive"});
      }
      
      // Auto-save if results are generated
      let currentSaveSuccess = false;
      let historicalSaveSuccess = false;
      let currentSaveMessage = "";
      let historicalSaveMessage = "";

      if (currentPredResult && currentPredResult.length > 0) {
        setIsSavingCurrentDraw(true);
        const saveCurrentResult = await saveCurrentDrawToolPrediction(
          serializableTool.id,
          serializableTool.name,
          officialDrawId, 
          "PENDING_DRAW", // Or a more dynamic date if available
          currentPredResult,
          adminUserId
        );
        setIsSavingCurrentDraw(false);
        if (saveCurrentResult.success) {
          currentSaveSuccess = true;
          currentSaveMessage = saveCurrentResult.message || `期号 ${officialDrawId} 的预测已成功保存/更新。`;
          setSavedPredictionForTargetDraw(currentPredResult); // Update displayed saved prediction
        } else {
          currentSaveMessage = saveCurrentResult.message || `无法保存期号 ${officialDrawId} 的预测。`;
        }
      } else {
         currentSaveMessage = `工具 ${serializableTool.name} 生成了空的当期预测，未保存。`;
      }

      if (historicalPerfResult && historicalPerfResult.length > 0) {
        setIsSavingHistorical(true);
        const predictionsToSaveForDb: ToolPredictionInput[] = historicalPerfResult.map(hp => ({
          toolId: serializableTool.id,
          toolName: serializableTool.name,
          targetDrawNumber: hp.targetDraw.drawNumber,
          targetDrawDate: hp.targetDraw.date,
          predictedNumbers: hp.predictedNumbersForTargetDraw,
          userId: adminUserId,
        }));
        
        console.log("[ToolDetailClient] Preparing to save historical predictions:", predictionsToSaveForDb.slice(0,2));
        const saveHistoricalResult = await saveHistoricalToolPredictions(
          serializableTool.id,
          serializableTool.name,
          predictionsToSaveForDb,
          adminUserId
        );
        setIsSavingHistorical(false);
        if (saveHistoricalResult.success) {
          historicalSaveSuccess = true;
          historicalSaveMessage = saveHistoricalResult.message || `已成功保存/更新 ${saveHistoricalResult.savedCount || 0} 条历史回测预测。`;
        } else {
          historicalSaveMessage = saveHistoricalResult.message || "无法批量保存历史回测预测。";
        }
      } else {
        historicalSaveMessage = "没有从历史表现中生成可保存的预测数据。";
        console.log("[ToolDetailClient] No valid historical predictions to save from generated performance data.");
      }
      
      if (currentSaveSuccess && historicalSaveSuccess) {
        toast({ title: "预测已生成并全部自动保存", description: `${currentSaveMessage} ${historicalSaveMessage}` });
      } else if (currentSaveSuccess || historicalSaveSuccess) {
         toast({
          title: "预测处理与保存部分完成",
          description: `当期预测: ${currentSaveMessage} 历史回测: ${historicalSaveMessage}`,
          variant: "default",
          duration: 8000,
        });
      } else {
         toast({
          title: "预测生成或保存失败",
          description: `当期预测: ${currentSaveMessage} 历史回测: ${historicalSaveMessage}`,
          variant: "destructive",
          duration: 8000,
        });
      }

    } catch (error: any) {
      toast({ title: "预测或保存过程出错", description: error.message || "处理预测时发生未知错误。", variant: "destructive" });
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
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-md font-semibold mb-2 flex items-center gap-1.5">
              <Target className="h-5 w-5 text-primary" />
              期号 {officialDrawId} 预测号码:
            </h4>
            {isLoadingSavedPrediction && ( // This state might be less relevant if server pre-fetches
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" /> <span>正在加载已保存的预测...</span>
              </div>
            )}

            {savedPredictionForTargetDraw && savedPredictionForTargetDraw.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-1">已保存的预测 (来自数据库):</p>
                <NumberPickingToolDisplay numbers={savedPredictionForTargetDraw} />
              </>
            )}
            
            {/* Display for admin if prediction is newly generated but not yet officially "saved" as the current draw's one */}
            {isAdmin && currentPredictionForSave && currentPredictionForSave.length > 0 && !savedPredictionForTargetDraw && (
                 <div className="mt-3 p-3 border border-dashed border-amber-500 rounded-md bg-amber-500/10">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-1 font-semibold">
                        以下为新生成的期号 {officialDrawId} 预测 (待保存):
                    </p>
                    <NumberPickingToolDisplay numbers={currentPredictionForSave} />
                </div>
            )}

            {!isLoadingSavedPrediction && !savedPredictionForTargetDraw && !currentPredictionForSave && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                期号 {officialDrawId} 的预测尚未生成或保存。
                {isAdmin && " 请管理员点击下方“开始全面预测”按钮生成。"}
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="border-t pt-4">
              <h4 className="text-md font-semibold mb-3 flex items-center gap-1.5">
                <PlayCircle className="h-5 w-5 text-primary" />
                管理员操作
              </h4>
              <Button onClick={handleGenerateAllPredictions} disabled={isLoadingAllPredictions || !allHistoricalDataForPerformanceAnalysis || allHistoricalDataForPerformanceAnalysis.length === 0} className="w-full mb-2">
                {isLoadingAllPredictions ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                开始全面预测 (当期及历史回测，自动保存)
              </Button>
              {(isSavingCurrentDraw || isSavingHistorical) && (
                  <div className="flex items-center justify-center text-xs text-muted-foreground mt-1">
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      正在保存预测到数据库...
                  </div>
              )}
              {(!allHistoricalDataForPerformanceAnalysis || allHistoricalDataForPerformanceAnalysis.length === 0) && !isLoadingAllPredictions && (
                 <p className="text-xs text-red-500 text-center mt-1">无法进行预测，因历史数据不足。</p>
               )}
            </div>
          )}
          
          { (isLoadingAllPredictions || displayedHistoricalPerformances !== null) && (
             <div className="border-t pt-4">
                <h4 className="text-md font-semibold mb-3 flex items-center gap-1.5">
                  <ListOrdered className="h-5 w-5 text-primary" />
                  历史开奖动态预测表现:
                </h4>
                {isLoadingAllPredictions && displayedHistoricalPerformances === null && ( 
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">正在计算历史表现数据...</p>
                    </div>
                )}
                {displayedHistoricalPerformances && displayedHistoricalPerformances.length > 0 ? (
                  <ScrollArea className="h-[500px] rounded-md border p-3 space-y-4 bg-background/50">
                    {displayedHistoricalPerformances.map((performance) => {
                        if (!performance || !performance.targetDraw) return null;
                        const { targetDraw, predictedNumbersForTargetDraw, hitDetails, hitRate, hasAnyHit, predictionBasisDraws, isSavedPrediction } = performance;
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
                            <div className="text-xs font-medium">
                                目标期号:{" "}
                                <span className="font-semibold text-primary">
                                {targetDraw.drawNumber}
                                </span>{" "}
                                ({formatDateToLocale(targetDraw.date, zhCN)})
                                {isSavedPrediction && <Badge variant="outline" className="ml-2 text-xs">已保存</Badge>}
                            </div>
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
                            {predictedNumbersForTargetDraw.length > 0 && hitDetails && (
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
                                {hitDetails.matchedAdditionalNumberDetails?.matched ?
                                    <span className="font-semibold text-yellow-600">
                                    命中
                                    </span>
                                : (
                                    <span className="text-muted-foreground">
                                    未命中
                                    </span>
                                )}
                                </p>
                                <p>
                                正码命中率 (对比工具预测数量):{" "}
                                <span className="font-semibold">
                                    {hitRate !== undefined ? hitRate.toFixed(1) : 'N/A'}%
                                </span>
                                </p>
                            </div>
                            )}
                        </div>
                        );
                    })}
                    </ScrollArea>
                ) : (
                   !isLoadingAllPredictions && displayedHistoricalPerformances && displayedHistoricalPerformances.length === 0 && (
                     <Alert variant="default" className="mt-3">
                        <Database className="h-4 w-4" />
                        <AlertTitle>无历史表现数据</AlertTitle>
                        <AlertDescription>
                          未能从数据库加载已保存的历史预测表现，或历史数据不足以进行回测。
                        </AlertDescription>
                    </Alert>
                   )
                )}
            </div>
          )}
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            请注意：所有预测和分析仅供参考和娱乐，不构成任何投资建议。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
