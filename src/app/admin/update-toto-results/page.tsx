
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input"; // No longer needed for current draw info
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { HistoricalResult } from "@/lib/types";
import { z } from "zod";
import { ArrowLeft, CheckCircle, XCircle, Info, Loader2, ShieldAlert, RefreshCw, CloudUpload, FileText, Edit3 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { syncHistoricalResultsToFirestore, updateCurrentDrawDisplayInfo, getCurrentDrawDisplayInfo } from "@/lib/actions";
import { Separator } from "@/components/ui/separator";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";


const HistoricalResultSchema = z.object({
  drawNumber: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  numbers: z.array(z.number().min(1).max(49)).length(6, "Must have 6 winning numbers"),
  additionalNumber: z.number().min(1).max(49),
});

const HistoricalResultsArraySchema = z.array(HistoricalResultSchema);

type AdminClaimStatus = "loading" | "verified" | "not_found" | "error" | "not_admin_email";

const monthMap: { [key: string]: string } = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseDateFromText(dateStr: string): string {
  const parts = dateStr.split(" ");
  if (parts.length < 4) return ""; // e.g., "Thu, 22 May 2025"

  // Attempt to handle formats like "Day, DD Mon YYYY"
  const dayPartCandidate = parts[1]; // "22" or "22,"
  const monthPartCandidate = parts[2]; // "May"
  const yearPartCandidate = parts[3]; // "2025"

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [adminClaimStatus, setAdminClaimStatus] = useState<AdminClaimStatus>("loading");
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);

  const [currentDrawInfoText, setCurrentDrawInfoText] = useState("");
  const [isUpdatingDrawInfo, setIsUpdatingDrawInfo] = useState(false);
  const [isLoadingDrawInfo, setIsLoadingDrawInfo] = useState(true);


  const adminEmail = "admin@totokit.com";

  const checkAdminClaim = async (forceRefresh: boolean = false) => {
    if (!user) {
      setAdminClaimStatus("not_found");
      return;
    }
    setIsCheckingClaim(true);
    try {
      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      if (idTokenResult.claims.isAdmin === true) {
        setAdminClaimStatus("verified");
        toast({
          title: "管理员声明已验证",
          description: "您的账户已成功验证管理员权限。",
        });
      } else {
        setAdminClaimStatus("not_found");
        toast({
          title: "管理员声明未找到",
          description: "您的账户没有管理员声明。如果您的权限最近已更新，请尝试完全退出并重新登录，然后再次刷新声明。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching ID token result:", error);
      setAdminClaimStatus("error");
      toast({
        title: "检查声明失败",
        description: "无法获取用户声明，请稍后再试。",
        variant: "destructive",
      });
    } finally {
      setIsCheckingClaim(false);
    }
  };

  const fetchCurrentDrawInfo = async () => {
    setIsLoadingDrawInfo(true);
    try {
      const info = await getCurrentDrawDisplayInfo();
      if (info && info.currentDrawDateTime && info.currentJackpot) {
        setCurrentDrawInfoText(`${info.currentDrawDateTime}\n${info.currentJackpot}`);
      } else {
        // Fallback or defaults if not found in Firestore
        setCurrentDrawInfoText("周四, 2025年5月29日, 傍晚6点30分\n$4,500,000 (估计)");
      }
    } catch (error) {
      console.error("Error fetching current draw info:", error);
      toast({
        title: "获取开奖信息失败",
        description: "无法从数据库加载当前的开奖信息和头奖金额。",
        variant: "destructive"
      });
      // Fallback to defaults
      setCurrentDrawInfoText("周四, 2025年5月29日, 傍晚6点30分\n$4,500,000 (估计)");
    } finally {
      setIsLoadingDrawInfo(false);
    }
  };


  useEffect(() => {
    if (!authLoading) {
      setIsCheckingAdmin(false);
      if (user && user.email === adminEmail) {
        setIsAdminByEmail(true);
        checkAdminClaim();
        fetchCurrentDrawInfo();
      } else {
        setIsAdminByEmail(false);
        setAdminClaimStatus("not_admin_email");
      }
    }
  }, [user, authLoading]);


  const handleParseTextAndSyncToFirestore = async () => {
    setValidationMessage(null);
    setValidationStatus(null);
    setIsProcessing(true);

    if (!plainTextData.trim()) {
      toast({ title: "无文本数据", description: "请输入要解析的文本结果。", variant: "default" });
      setValidationStatus("info");
      setValidationMessage("请输入要解析的纯文本结果。");
      setIsProcessing(false);
      return;
    }

    if (adminClaimStatus !== "verified") {
       toast({
        title: "权限不足",
        description: "需要已验证的管理员权限才能同步数据。",
        variant: "destructive",
      });
      setValidationStatus("error");
      setValidationMessage("权限不足：需要已验证的管理员权限才能同步数据。");
      setIsProcessing(false);
      return;
    }
    if (!user || !user.uid) {
      toast({
        title: "用户未登录",
        description: "管理员UID未找到，无法执行同步操作。",
        variant: "destructive",
      });
      setValidationStatus("error");
      setValidationMessage("用户未登录：管理员UID未找到，无法执行同步操作。");
      setIsProcessing(false);
      return;
    }

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
          parsingErrors.push(`记录 ${index + 1}: 日期 "${dateText}" 解析失败。日期格式应为：星期, 日 月份 年份 (例如 Thu, 22 May 2025)。`);
          return;
        }
        const drawNumber = parseInt(drawNoText, 10);
        if (isNaN(drawNumber)) {
          parsingErrors.push(`记录 ${index + 1}: 期号 "${drawNoText}" 解析失败。`);
          return;
        }
        const numbers = lines[2].split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (numbers.length !== 6) {
          parsingErrors.push(`记录 ${index + 1}: 中奖号码必须是6个数字。找到: ${numbers.join(', ')}`);
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
      setIsProcessing(false);
      return;
    }
    if (parsedResults.length === 0) {
      toast({ title: "无有效结果", description: "未能从文本中解析出任何有效结果。", variant: "default" });
      setValidationStatus("info");
      setValidationMessage("未能从文本中解析出任何有效结果。");
      setIsProcessing(false);
      return;
    }

    const validationResult = HistoricalResultsArraySchema.safeParse(parsedResults);
    if (!validationResult.success) {
      const errorIssues = validationResult.error.issues.map(issue => `路径 '${issue.path.join('.') || 'root'}': ${issue.message}`).join("\\n");
      const errorMsg = `解析的数据无效：\\n${errorIssues}`;
      toast({ title: "数据验证失败", description: errorMsg, variant: "destructive", duration: 10000 });
      setValidationStatus("error");
      setValidationMessage(errorMsg);
      setIsProcessing(false);
      return;
    }

    const validatedData = validationResult.data;
    const sortedData = [...validatedData].sort((a, b) => b.drawNumber - a.drawNumber);
    const jsonDataToSync = JSON.stringify(sortedData, null, 2);

    try {
      const syncResult = await syncHistoricalResultsToFirestore(jsonDataToSync, user.uid);
      if (syncResult.success) {
        toast({
          title: "历史结果同步成功",
          description: syncResult.message || `成功同步 ${syncResult.count || 0} 条历史记录。`,
        });
        setValidationStatus("success");
        setValidationMessage(syncResult.message || `成功同步 ${syncResult.count || 0} 条历史记录到 Firestore。`);
        setPlainTextData(""); 
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
      toast({
        title: "历史结果同步出错",
        description: error.message || "调用服务器操作时发生未知错误。",
        variant: "destructive",
      });
      setValidationStatus("error");
      setValidationMessage(`历史结果同步出错: ${error.message || "未知错误"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCurrentDrawInfo = async () => {
    if (adminClaimStatus !== "verified" || !user) {
      toast({ title: "权限不足", description: "需要管理员权限才能更新。", variant: "destructive" });
      return;
    }
    if (!currentDrawInfoText.trim()) {
      toast({ title: "输入不完整", description: "请输入本期开奖信息。", variant: "destructive" });
      return;
    }

    setIsUpdatingDrawInfo(true);
    try {
      const result = await updateCurrentDrawDisplayInfo(
        currentDrawInfoText,
        user.uid
      );
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

  if (isCheckingAdmin || authLoading) {
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
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Link>
        </Button>
        {user && user.email === adminEmail && (
          <Button onClick={() => checkAdminClaim(true)} variant="outline" size="sm" disabled={isCheckingClaim}>
            {isCheckingClaim ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            刷新并检查管理员声明
          </Button>
        )}
      </div>

      {user && user.email === adminEmail && (
        <Card className="w-full mb-6">
          <CardHeader>
            <CardTitle>管理员状态 (用于 Firestore 操作)</CardTitle>
          </CardHeader>
          <CardContent>
            {isCheckingClaim ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>正在检查管理员声明...</p>
              </div>
            ) : adminClaimStatus === "verified" ? (
              <Alert variant="default">
                <CheckCircle className="h-5 w-5" />
                <AlertTitle>管理员声明已验证</AlertTitle>
                <AlertDescription>
                  您的账户拥有执行 Firestore 操作的管理员权限。
                </AlertDescription>
              </Alert>
            ) : adminClaimStatus === "not_found" ? (
              <Alert variant="destructive">
                <XCircle className="h-5 w-5" />
                <AlertTitle>管理员声明未找到</AlertTitle>
                <AlertDescription>
                  您的账户没有管理员声明。如果您认为这是一个错误，或者您的权限最近已更新，请尝试完全退出并重新登录，然后再次刷新声明。Firestore 操作可能无法执行。
                  <Button onClick={() => checkAdminClaim(true)} variant="link" className="p-0 h-auto ml-1 text-destructive hover:underline">
                     (再次尝试刷新声明)
                  </Button>
                </AlertDescription>
              </Alert>
            ) : adminClaimStatus === "error" ? (
              <Alert variant="destructive">
                <XCircle className="h-5 w-5" />
                <AlertTitle>检查声明时出错</AlertTitle>
                <AlertDescription>
                  获取您的管理员声明时发生错误。请稍后再试。Firestore 操作可能无法执行。
                </AlertDescription>
              </Alert>
            ) : null }
             {(adminClaimStatus === "not_found" || adminClaimStatus === "error") && (
                <p className="text-xs text-muted-foreground mt-2">
                  注意：管理员声明验证与需要特定声明（如 Firestore 规则中的 `request.auth.token.isAdmin == true`）的操作相关。
                </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary"/>
            更新本期开奖信息 (首页显示)
          </CardTitle>
          <CardDescription>
            在此处粘贴或编辑将在首页显示的“本期开奖”日期/时间和“预估头奖”金额。请确保第一行为日期/时间，第二行为头奖金额。
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
                placeholder="例如:\n周四, 2025年5月29日, 傍晚6点30分\n$4,500,000 (估计)"
                rows={3}
                className="mt-1 font-mono text-sm"
                disabled={isUpdatingDrawInfo}
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpdateCurrentDrawInfo} 
            className="w-full"
            disabled={isUpdatingDrawInfo || adminClaimStatus !== 'verified' || isLoadingDrawInfo}
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
            <FileText className="h-5 w-5 text-primary"/>
             更新历史开奖结果 (Firestore)
            </CardTitle>
          <CardDescription>
            在下方粘贴**纯文本格式**的开奖结果。系统将解析、验证数据，然后直接将其同步到 Firestore。
            确保文本中的每一条记录都包含5行：日期和期号（制表符分隔），"Winning Numbers"，中奖号码（空格分隔），"Additional Number"，特别号码。多条记录用空行分隔。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="plainTextData" className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5"/> 粘贴纯文本结果
            </Label>
            <Textarea
              id="plainTextData"
              value={plainTextData}
              onChange={(e) => setPlainTextData(e.target.value)}
              placeholder={`例如:\nThu, 22 May 2025\tDraw No. 4080\nWinning Numbers\n3 10 32 34 44 48\nAdditional Number\n29\n\n(多条记录请用空行分隔)`}
              rows={10}
              className="mt-2 font-mono text-sm"
              disabled={isProcessing}
            />
          </div>

          <Separator />

          <Button 
            onClick={handleParseTextAndSyncToFirestore} 
            className="w-full"
            disabled={isProcessing || adminClaimStatus !== 'verified'}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" />
            )}
            解析文本并同步历史结果到 Firestore
          </Button>
          {(adminClaimStatus !== 'verified') && (
            <p className="text-xs text-red-600 text-center -mt-4">
              需要已验证的管理员权限才能同步。
            </p>
          )}


          {validationMessage && (
            <Alert variant={validationStatus === "success" ? "default" : validationStatus === "error" ? "destructive": "default"} className="mt-4">
              {validationStatus === "success" && <CheckCircle className="h-5 w-5" />}
              {validationStatus === "error" && <XCircle className="h-5 w-5" />}
              {validationStatus === "info" && <Info className="h-5 w-5" />}
              <AlertTitle>
                {validationStatus === "success" ? "操作成功" : validationStatus === "error" ? "操作失败" : "提示"}
              </AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {validationMessage}
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            此页面用于通过纯文本输入，辅助手动更新开奖结果数据并同步到 Firestore。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

