
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { HistoricalResult } from "@/lib/types";
import { HistoricalResultSchema as AdminPageHistoricalResultSchema } from "@/lib/types"; 
import { z } from "zod";
import { ArrowLeft, CheckCircle, XCircle, Info, Loader2, ShieldAlert, RefreshCw, CloudUpload, FileText, Edit3, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  syncHistoricalResultsToFirestore, 
  updateCurrentDrawDisplayInfo, 
  getCurrentDrawDisplayInfo,
  adminRecalculateAndSaveAllToolPredictions 
} from "@/lib/actions";
import { Separator } from "@/components/ui/separator";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types";


const ClientSideHistoricalResultsArraySchema = z.array(AdminPageHistoricalResultSchema);

const monthMap: { [key: string]: string } = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseDateFromText(dateStr: string): string {
  const parts = dateStr.split(" ");
  if (parts.length < 4) return "";

  const dayPartCandidate = parts[1];
  const monthPartCandidate = parts[2];
  const yearPartCandidate = parts[3];

  if (!dayPartCandidate || !monthPartCandidate || !yearPartCandidate) return "";

  const day = dayPartCandidate.replace(/,$/, "").padStart(2, "0");
  const month = monthMap[monthPartCandidate];
  const year = yearPartCandidate;

  if (!month || !year || !day || isNaN(parseInt(day)) || isNaN(parseInt(year))) return "";
  return `${year}-${month}-${day}`;
}


export default function AdminUpdateTotoResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [plainTextData, setPlainTextData] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<"success" | "error" | "info" | null>(null);
  const [isSyncingHistorical, setIsSyncingHistorical] = useState(false);
  
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [currentDrawInfoText, setCurrentDrawInfoText] = useState("");
  const [isUpdatingDrawInfo, setIsUpdatingDrawInfo] = useState(false);
  const [isLoadingDrawInfo, setIsLoadingDrawInfo] = useState(true);

  const [isProcessingPredictions, setIsProcessingPredictions] = useState(false);

  const adminEmail = "admin@totokit.com";
  const adminUID = "mAvLawNGpGdKwPoHuMQyXlKpPNv1";

  const fetchCurrentDrawInfo = async () => {
    setIsLoadingDrawInfo(true);
    try {
      const info = await getCurrentDrawDisplayInfo();
      if (info && info.currentDrawDateTime && info.currentJackpot) {
        setCurrentDrawInfoText(`${info.currentDrawDateTime}\n${info.currentJackpot}`);
      } else {
        setCurrentDrawInfoText("周四, 2025年5月29日, 傍晚6点30分\n$4,500,000");
      }
    } catch (error) {
      console.error("Error fetching current draw info:", error);
      toast({
        title: "获取开奖信息失败",
        description: "无法从数据库加载当前的开奖信息和头奖金额。",
        variant: "destructive"
      });
      setCurrentDrawInfoText("周四, 2025年5月29日, 傍晚6点30分\n$4,500,000");
    } finally {
      setIsLoadingDrawInfo(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user && user.email === adminEmail && user.uid === adminUID) {
        setIsAdminByEmail(true);
        fetchCurrentDrawInfo();
      } else {
        setIsAdminByEmail(false);
      }
    }
  }, [user, authLoading]);


  const handleParseTextAndSyncToFirestore = async () => {
    setValidationMessage(null);
    setValidationStatus(null);
    
    if (!plainTextData.trim()) {
      toast({ title: "无文本数据", description: "请输入要解析的文本结果。", variant: "default" });
      setValidationStatus("info");
      setValidationMessage("请输入要解析的纯文本结果。");
      return;
    }
    
    if (!user || user.uid !== adminUID) {
      toast({ title: "权限不足", description: "只有指定管理员才能执行此操作。", variant: "destructive" });
      setValidationStatus("error");
      setValidationMessage("权限不足：只有指定管理员才能执行此操作。");
      return;
    }
    setIsSyncingHistorical(true);

    const entries = plainTextData.trim().split(/\n\s*\n/);
    const parsedResults: HistoricalResult[] = [];
    let parsingErrors: string[] = [];

    entries.forEach((entry, index) => {
      const lines = entry.trim().split('\n').map(line => line.trim());
      if (lines.length < 5) {
        parsingErrors.push(`记录 ${index + 1}: 格式不完整，至少需要5行。`);
        return;
      }
      try {
        const firstLineParts = lines[0].split('\t');
        if (firstLineParts.length < 2) {
          parsingErrors.push(`记录 ${index + 1}: 第一行格式错误，无法分离日期和期号。`);
          return;
        }
        const dateText = firstLineParts[0];
        const drawNoText = firstLineParts[1].replace('Draw No.', '').trim();

        const date = parseDateFromText(dateText);
        if (!date) {
          parsingErrors.push(`记录 ${index + 1}: 日期 "${dateText}" 解析失败。`);
          return;
        }
        const drawNumber = parseInt(drawNoText, 10);
        if (isNaN(drawNumber)) {
          parsingErrors.push(`记录 ${index + 1}: 期号 "${drawNoText}" 解析失败。`);
          return;
        }
        const numbers = lines[2].split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (numbers.length !== 6) {
          parsingErrors.push(`记录 ${index + 1}: 中奖号码必须是6个数字。`);
          return;
        }
        const additionalNumber = parseInt(lines[4], 10);
        if (isNaN(additionalNumber)) {
          parsingErrors.push(`记录 ${index + 1}: 特别号码 "${lines[4]}" 解析失败。`);
          return;
        }
        parsedResults.push({ drawNumber, date, numbers, additionalNumber });
      } catch (e) {
        parsingErrors.push(`记录 ${index + 1}: 解析时发生意外错误 - ${e instanceof Error ? e.message : String(e)}`);
      }
    });

    if (parsingErrors.length > 0) {
      const errorMsg = `文本解析错误：\n- ${parsingErrors.join('\n- ')}`;
      toast({ title: "文本解析失败", description: errorMsg, variant: "destructive", duration: 10000 });
      setValidationStatus("error");
      setValidationMessage(errorMsg);
      setIsSyncingHistorical(false);
      return;
    }
    if (parsedResults.length === 0) {
      toast({ title: "无有效结果", description: "未能从文本中解析出任何有效结果。", variant: "default" });
      setValidationStatus("info");
      setValidationMessage("未能从文本中解析出任何有效结果。");
      setIsSyncingHistorical(false);
      return;
    }

    const validationResult = ClientSideHistoricalResultsArraySchema.safeParse(parsedResults);
    if (!validationResult.success) {
      const errorIssues = validationResult.error.issues.map(issue => `路径 '${issue.path.join('.') || 'root'}': ${issue.message}`).join("\\n");
      const errorMsg = `解析的数据无效：\\n${errorIssues}`;
      toast({ title: "数据验证失败", description: errorMsg, variant: "destructive", duration: 10000 });
      setValidationStatus("error");
      setValidationMessage(errorMsg);
      setIsSyncingHistorical(false);
      return;
    }

    const validatedData = validationResult.data;
    const sortedData = [...validatedData].sort((a, b) => b.drawNumber - a.drawNumber);
    const jsonDataToSync = JSON.stringify(sortedData, null, 2);

    try {
      // Pass admin's UID to the server action
      const syncResult = await syncHistoricalResultsToFirestore(jsonDataToSync, user.uid); 
      if (syncResult.success) {
        toast({
          title: "历史结果同步成功",
          description: syncResult.message || `成功同步 ${syncResult.count || 0} 条历史记录。`,
        });
        setValidationStatus("success");
        setValidationMessage(syncResult.message || `成功同步 ${syncResult.count || 0} 条历史记录到 Firestore。\n现在您可以考虑点击下方的“处理当前预测并生成下一期”按钮。`);
        // setPlainTextData(""); // Optionally clear plain text data
      } else {
        toast({
          title: "历史结果同步失败",
          description: syncResult.message || "服务器报告同步失败。",
          variant: "destructive",
        });
        setValidationStatus("error");
        setValidationMessage(`历史结果同步失败: ${syncResult.message || "未知错误"}`);
      }
    } catch (error: any) {
      console.error("Error calling syncHistoricalResultsToFirestore server action:", error);
      let specificMessage = "历史结果同步出错: ";
      if (error instanceof Error) {
        specificMessage += error.message;
      } else {
        specificMessage += "未知错误";
      }
      toast({
        title: "历史结果同步出错",
        description: specificMessage,
        variant: "destructive",
      });
      setValidationStatus("error");
      setValidationMessage(specificMessage);
    } finally {
      setIsSyncingHistorical(false);
    }
  };

  const handleUpdateCurrentDrawInfo = async () => {
    if (!user || user.uid !== adminUID) {
      toast({ title: "权限不足", description: "需要管理员权限才能更新。", variant: "destructive" });
      return;
    }
    if (!currentDrawInfoText.trim()) {
      toast({ title: "输入不完整", description: "请输入本期开奖信息。", variant: "destructive" });
      return;
    }

    const lines = currentDrawInfoText
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== "" && line.toLowerCase() !== "本期开奖信息" && line.toLowerCase() !== "当前头奖预估");

    if (lines.length < 2) {
      toast({
        title: "输入格式错误",
        description: "请确保至少提供了两行有效信息：第一行为开奖日期/时间，第二行为头奖金额。",
        variant: "destructive",
      });
      return;
    }

    const extractedDrawTime = lines[0];
    const extractedJackpot = lines[1];

    setIsUpdatingDrawInfo(true);
    try {
      const result = await updateCurrentDrawDisplayInfo(extractedDrawTime, extractedJackpot, user.uid);
      if (result.success) {
        toast({ title: "本期开奖信息更新成功", description: result.message });
      } else {
        toast({ title: "更新失败", description: result.message || "无法更新本期开奖信息。", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "更新出错", description: error.message || "更新本期开奖信息时发生错误。", variant: "destructive" });
    } finally {
      setIsUpdatingDrawInfo(false);
    }
  };

  const handleProcessAndPrepareNextPredictions = async () => {
    if (!user || user.uid !== adminUID) {
      toast({ title: "权限不足", description: "只有管理员才能执行此操作。", variant: "destructive" });
      return;
    }
    setIsProcessingPredictions(true);
    setValidationMessage("正在处理当前预测并生成下一期预测，这可能需要一些时间...");
    setValidationStatus("info");

    try {
      const result = await adminRecalculateAndSaveAllToolPredictions(user.uid);
      if (result.success) {
        toast({
          title: "预测处理成功",
          description: result.message || "所有工具的当期预测日期已更新，下一期预测已生成。",
          duration: 7000,
        });
        setValidationStatus("success");
        setValidationMessage(`${result.message}\n详情:\n${(result.details || []).join('\n')}`);
      } else {
        toast({
          title: "预测处理失败",
          description: result.message || "处理过程中发生错误。",
          variant: "destructive",
          duration: 10000,
        });
        setValidationStatus("error");
        setValidationMessage(`处理失败: ${result.message}\n详情:\n${(result.details || []).join('\n')}`);
      }
    } catch (error: any) {
      toast({
        title: "预测处理出错",
        description: error.message || "执行预测处理时发生未知错误。",
        variant: "destructive",
        duration: 10000,
      });
      setValidationStatus("error");
      setValidationMessage(`预测处理出错: ${error.message || "未知错误"}`);
    } finally {
      setIsProcessingPredictions(false);
    }
  };


  if (authLoading) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminByEmail) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 text-center">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-3xl font-bold mb-4">无权访问</h1>
          <p className="text-lg text-muted-foreground mb-6">抱歉，您没有权限访问此页面。</p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回主页
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">管理员后台</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            更新本期开奖信息 (首页显示)
          </CardTitle>
          <CardDescription>
            在此处粘贴本期开奖的日期/时间和预估头奖金额。请确保第一行为日期/时间，第二行为头奖金额。系统会自动忽略如“本期开奖信息”或“当前头奖预估”之类的标签行。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDrawInfo ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>正在加载当前开奖信息...</p>
            </div>
          ) : (
            <div>
              <Label htmlFor="currentDrawInfoText">本期开奖信息 (纯文本)</Label>
              <Textarea
                id="currentDrawInfoText"
                value={currentDrawInfoText}
                onChange={(e) => setCurrentDrawInfoText(e.target.value)}
                placeholder={"例如:\n周四, 2025年5月29日, 傍晚6点30分\n$4,500,000\n\n或包含标签的完整格式：\n本期开奖信息\n周四, 2025年5月29日, 傍晚6点30分\n当前头奖预估\n$4,500,000"}
                rows={5}
                className="mt-1 font-mono text-sm"
                disabled={isUpdatingDrawInfo || !isAdminByEmail}
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUpdateCurrentDrawInfo}
            className="w-full"
            disabled={isUpdatingDrawInfo || !isAdminByEmail || isLoadingDrawInfo}
          >
            {isUpdatingDrawInfo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" />
            )}
            更新本期开奖信息到 Firestore
          </Button>
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            更新历史开奖结果 (Firestore)
          </CardTitle>
          <CardDescription>
            在下方粘贴**纯文本格式**的开奖结果。系统将解析、验证数据，然后直接将其同步到 Firestore。
            确保文本中的每一条记录都包含5行：日期和期号（制表符分隔），"Winning Numbers"，中奖号码（空格分隔），"Additional Number"，特别号码。多条记录用空行分隔。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="plainTextData" className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" /> 粘贴纯文本结果
            </Label>
            <Textarea
              id="plainTextData"
              value={plainTextData}
              onChange={(e) => setPlainTextData(e.target.value)}
              placeholder={`例如:\nThu, 22 May 2025\tDraw No. 4080\nWinning Numbers\n3 10 32 34 44 48\nAdditional Number\n29\n\n(多条记录请用空行分隔)`}
              rows={10}
              className="mt-2 font-mono text-sm"
              disabled={isSyncingHistorical || !isAdminByEmail}
            />
          </div>

          <Button
            onClick={handleParseTextAndSyncToFirestore}
            className="w-full"
            disabled={isSyncingHistorical || !isAdminByEmail}
          >
            {isSyncingHistorical ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" />
            )}
            解析文本并同步历史结果到 Firestore
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-primary" />
            工具预测处理
          </CardTitle>
          <CardDescription>
            在同步最新的历史开奖结果后，点击下方按钮可为所有选号工具：
            1. 将当前待开奖期号 ({OFFICIAL_PREDICTIONS_DRAW_ID}) 的预测记录的日期更新为最新的实际开奖日期。
            2. 为下一个期号 (例如 {Number(OFFICIAL_PREDICTIONS_DRAW_ID) + 1}) 生成并保存新的 "PENDING_DRAW" 预测。
            此操作会更新数据库中 `toolPredictions` 集合的数据，可能需要一些时间。它不会重新计算已保存的其他历史期号的回测。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleProcessAndPrepareNextPredictions}
            className="w-full"
            disabled={isProcessingPredictions || !isAdminByEmail}
            variant="destructive"
          >
            {isProcessingPredictions ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            处理当前预测并生成下一期
          </Button>
        </CardContent>
      </Card>

      {validationMessage && (
        <Alert variant={validationStatus === "success" ? "default" : validationStatus === "error" ? "destructive" : "default"} className="mt-4">
          {validationStatus === "success" && <CheckCircle className="h-5 w-5" />}
          {validationStatus === "error" && <XCircle className="h-5 w-5" />}
          {validationStatus === "info" && <Info className="h-5 w-5" />}
          <AlertTitle>
            {validationStatus === "success" ? "操作成功" : validationStatus === "error" ? "操作失败" : "操作信息"}
          </AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {validationMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

    
