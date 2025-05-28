
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MOCK_HISTORICAL_DATA, type HistoricalResult } from "@/lib/types";
import { z } from "zod";
import { ArrowLeft, CheckCircle, XCircle, Info, Loader2, ShieldAlert, RefreshCw, CloudUpload, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { syncHistoricalResultsToFirestore } from "@/lib/actions";
import { Separator } from "@/components/ui/separator";

// Zod schema for validation
const HistoricalResultSchema = z.object({
  drawNumber: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  numbers: z.array(z.number().min(1).max(49)).length(6, "Must have 6 winning numbers"),
  additionalNumber: z.number().min(1).max(49),
});

const HistoricalResultsArraySchema = z.array(HistoricalResultSchema);

type AdminClaimStatus = "loading" | "verified" | "not_found" | "error" | "not_admin_email";

// Month mapping for date parsing
const monthMap: { [key: string]: string } = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseDateFromText(dateStr: string): string {
  const parts = dateStr.split(" ");
  if (parts.length < 4) return "";

  const dayPart = parts[1].replace(/,$/, ""); // Remove comma if present
  const day = dayPart.padStart(2, "0");
  const month = monthMap[parts[2]];
  const year = parts[3];

  if (!month || !year || !day) return "";
  return `${year}-${month}-${day}`;
}


export default function AdminUpdateTotoResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  // jsonData will now primarily be driven by plainTextData merging
  const [jsonData, setJsonData] = useState(JSON.stringify(MOCK_HISTORICAL_DATA, null, 2));
  const [plainTextData, setPlainTextData] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<"success" | "error" | "info" | null>(null);
  const [validatedJsonOutput, setValidatedJsonOutput] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [adminClaimStatus, setAdminClaimStatus] = useState<AdminClaimStatus>("loading");
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);

  const adminEmail = "admin@totokit.com";

  const checkAdminClaim = async (forceRefresh: boolean = false) => {
    if (!user) {
      setAdminClaimStatus("not_found");
      return;
    }
    setIsCheckingClaim(true);
    try {
      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      console.log("ID Token Claims:", idTokenResult.claims);
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


  useEffect(() => {
    if (!authLoading) {
      setIsCheckingAdmin(false);
      if (user && user.email === adminEmail) {
        setIsAdminByEmail(true);
        checkAdminClaim();
      } else {
        setIsAdminByEmail(false);
        setAdminClaimStatus("not_admin_email");
      }
    }
  }, [user, authLoading]);


  const handleValidateJsonData = () => {
    setValidationMessage(null);
    setValidationStatus(null);
    setValidatedJsonOutput(null);

    try {
      const parsedData = JSON.parse(jsonData);
      const validationResult = HistoricalResultsArraySchema.safeParse(parsedData);

      if (validationResult.success) {
        const sortedData = [...validationResult.data].sort((a, b) => b.drawNumber - a.drawNumber);
        setValidationStatus("success");
        setValidationMessage("JSON数据有效！现在您可以通过服务器操作将其同步到 Firestore。");
        setValidatedJsonOutput(JSON.stringify(sortedData, null, 2));
        // jsonData is already up-to-date from merging or direct edit if we re-introduce it
      } else {
        setValidationStatus("error");
        const errorIssues = validationResult.error.issues.map(issue => `路径 '${issue.path.join('.') || 'root'}': ${issue.message}`).join("\\n");
        setValidationMessage(`JSON数据无效：\\n${errorIssues}`);
      }
    } catch (error) {
      setValidationStatus("error");
      setValidationMessage(`JSON解析错误：${error instanceof Error ? error.message : "未知解析错误"}`);
    }
  };

  const parseAndMergePlainTextResults = () => {
    if (!plainTextData.trim()) {
      toast({ title: "无文本数据", description: "请输入要解析的文本结果。", variant: "default" });
      return;
    }

    const entries = plainTextData.trim().split(/\n\s*\n/);
    const newResults: HistoricalResult[] = [];
    let errors: string[] = [];

    entries.forEach((entry, index) => {
      const lines = entry.trim().split('\n').map(line => line.trim());
      if (lines.length < 5) {
        errors.push(`记录 ${index + 1}: 格式不完整，至少需要5行。`);
        return;
      }

      try {
        const firstLineParts = lines[0].split('\t');
        if (firstLineParts.length < 2) {
          errors.push(`记录 ${index + 1}: 第一行格式错误，无法分离日期和期号。`);
          return;
        }
        const dateText = firstLineParts[0];
        const drawNoText = firstLineParts[1].replace('Draw No.', '').trim();

        const date = parseDateFromText(dateText);
        if (!date) {
          errors.push(`记录 ${index + 1}: 日期 "${dateText}" 解析失败。`);
          return;
        }
        const drawNumber = parseInt(drawNoText, 10);
        if (isNaN(drawNumber)) {
          errors.push(`记录 ${index + 1}: 期号 "${drawNoText}" 解析失败。`);
          return;
        }

        const numbers = lines[2].split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (numbers.length !== 6) {
          errors.push(`记录 ${index + 1}: 中奖号码必须是6个数字。找到: ${numbers.join(', ')}`);
          return;
        }

        const additionalNumber = parseInt(lines[4], 10);
        if (isNaN(additionalNumber)) {
          errors.push(`记录 ${index + 1}: 特别号码 "${lines[4]}" 解析失败。`);
          return;
        }

        const historicalResult: HistoricalResult = { drawNumber, date, numbers, additionalNumber };

        const validation = HistoricalResultSchema.safeParse(historicalResult);
        if (!validation.success) {
            errors.push(`记录 ${index + 1} (期号 ${drawNumber}): 验证失败 - ${validation.error.issues.map(i => i.message).join(', ')}`);
            return;
        }
        newResults.push(validation.data);

      } catch (e) {
        errors.push(`记录 ${index + 1}: 解析时发生意外错误 - ${e instanceof Error ? e.message : String(e)}`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "文本解析错误",
        description: `发现 ${errors.length} 个错误：\n- ${errors.join('\n- ')}`,
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    if (newResults.length === 0) {
      toast({ title: "无有效结果", description: "未能从文本中解析出任何有效结果。", variant: "default" });
      return;
    }

    let currentJsonDataArray: HistoricalResult[] = [];
    try {
      currentJsonDataArray = JSON.parse(jsonData);
      if (!Array.isArray(currentJsonDataArray)) currentJsonDataArray = [];
    } catch (e) {
      console.warn("Current jsonData is invalid or empty, starting merge with empty array.");
      currentJsonDataArray = MOCK_HISTORICAL_DATA; // Fallback to mock if current is bad/empty
    }

    const mergedDataMap = new Map<number, HistoricalResult>();
    currentJsonDataArray.forEach(res => mergedDataMap.set(res.drawNumber, res));
    newResults.forEach(res => mergedDataMap.set(res.drawNumber, res));

    const mergedArray = Array.from(mergedDataMap.values()).sort((a, b) => b.drawNumber - a.drawNumber);

    const newJsonDataString = JSON.stringify(mergedArray, null, 2);
    setJsonData(newJsonDataString); // Update internal JSON representation
    setPlainTextData("");
    handleValidateJsonData(); // Validate the newly merged data
    toast({ title: "解析并合并成功", description: `成功解析并合并 ${newResults.length} 条记录。请验证下方更新的JSON数据。` });
  };


  const handleSyncDirectlyToFirestore = async () => {
    if (!validatedJsonOutput || adminClaimStatus !== "verified") {
       toast({
        title: "操作无法执行",
        description: "需要有效的JSON数据和已验证的管理员权限才能同步。",
        variant: "destructive",
      });
      return;
    }
    if (!user || !user.uid) {
      toast({
        title: "用户未登录",
        description: "管理员UID未找到，无法执行同步操作。",
        variant: "destructive",
      });
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncHistoricalResultsToFirestore(validatedJsonOutput, user.uid);
      if (result.success) {
        toast({
          title: "同步成功 (服务器操作)",
          description: result.message || `成功同步 ${result.count || 0} 条记录。`,
        });
      } else {
        toast({
          title: "同步失败 (服务器操作)",
          description: result.message || "服务器操作报告同步失败。",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error calling syncHistoricalResultsToFirestore server action:", error);
       toast({
        title: "同步出错 (服务器操作)",
        description: error.message || "调用服务器操作时发生未知错误。",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
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
                  注意：管理员声明验证与需要特定声明（如 Cloud Function 中的 `context.auth.token.isAdmin == true` 或 Firestore 规则中的 `request.auth.token.isAdmin == true`）的操作相关。服务器操作也可能依赖此进行权限检查。
                </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>管理员：手动更新TOTO开奖结果</CardTitle>
          <CardDescription>
            您可以在下方粘贴**纯文本格式**的新开奖结果。系统将解析数据、合并，然后您可以验证合并后的数据并将其同步到 Firestore。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div>
            <Label htmlFor="plainTextData" className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5"/> 添加纯文本格式结果
            </Label>
            <Textarea
              id="plainTextData"
              value={plainTextData}
              onChange={(e) => setPlainTextData(e.target.value)}
              placeholder={`例如:\nThu, 22 May 2025\tDraw No. 4080\nWinning Numbers\n3 10 32 34 44 48\nAdditional Number\n29\n\n(多条记录请用空行分隔)`}
              rows={10}
              className="mt-2 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              每条记录5行，按顺序为：日期和期号 (制表符分隔)，"Winning Numbers"，中奖号码 (空格分隔)，"Additional Number"，特别号码。多条记录用空行分隔。
            </p>
            <Button onClick={parseAndMergePlainTextResults} className="w-full mt-3" variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> 从文本解析并添加到当前数据
            </Button>
          </div>

          <Separator />

          <Button onClick={handleValidateJsonData} className="w-full">
            验证当前数据 (合并后)
          </Button>

          {validationMessage && (
            <Alert variant={validationStatus === "success" ? "default" : validationStatus === "error" ? "destructive": "default"} className="mt-4">
              {validationStatus === "success" && <CheckCircle className="h-5 w-5" />}
              {validationStatus === "error" && <XCircle className="h-5 w-5" />}
              {validationStatus === "info" && <Info className="h-5 w-5" />}
              <AlertTitle>
                {validationStatus === "success" ? "验证成功" : validationStatus === "error" ? "验证失败" : "提示"}
              </AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {validationMessage}
              </AlertDescription>
            </Alert>
          )}

          {validatedJsonOutput && validationStatus === "success" && (
            <div className="mt-6 space-y-4 p-4 border rounded-md bg-muted/50">
              <Button
                onClick={handleSyncDirectlyToFirestore}
                disabled={isSyncing || adminClaimStatus !== 'verified'}
                className="w-full"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                同步到 Firestore (服务器操作)
              </Button>
              {(adminClaimStatus !== 'verified') && (
                <p className="text-xs text-red-600 text-center mt-2">
                  需要已验证的管理员权限才能通过服务器操作同步到 Firestore。
                </p>
              )}
            </div>
          )}

        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            此页面用于辅助手动更新开奖结果数据并同步到 Firestore。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
