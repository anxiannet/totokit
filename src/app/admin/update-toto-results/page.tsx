
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MOCK_HISTORICAL_DATA, type HistoricalResult } from "@/lib/types";
import { z } from "zod";
import { ArrowLeft, CheckCircle, XCircle, Info, Loader2, ShieldAlert, RefreshCw, Database } from "lucide-react";
import Link from "next/link";
import { syncHistoricalResultsToFirestore } from "@/lib/actions"; // Server action for direct Firestore sync
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getIdTokenResult } from "firebase/auth";

// Zod schema for validation
const HistoricalResultSchema = z.object({
  drawNumber: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  numbers: z.array(z.number().min(1).max(49)).length(6, "Must have 6 winning numbers"),
  additionalNumber: z.number().min(1).max(49),
});

const HistoricalResultsArraySchema = z.array(HistoricalResultSchema);

type AdminClaimStatus = "loading" | "verified" | "not_found" | "error" | "not_admin_email";

export default function AdminUpdateTotoResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [jsonData, setJsonData] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<"success" | "error" | "info" | null>(null);
  const [validatedJsonOutput, setValidatedJsonOutput] = useState<string | null>(null);
  const [isSyncingDirectly, setIsSyncingDirectly] = useState(false);
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
        setJsonData(JSON.stringify(MOCK_HISTORICAL_DATA, null, 2));
        checkAdminClaim(); 
      } else {
        setIsAdminByEmail(false);
        setAdminClaimStatus("not_admin_email");
      }
    }
  }, [user, authLoading]);


  const handleValidateAndPrepare = () => {
    setValidationMessage(null);
    setValidationStatus(null);
    setValidatedJsonOutput(null);

    try {
      const parsedData = JSON.parse(jsonData);
      const validationResult = HistoricalResultsArraySchema.safeParse(parsedData);

      if (validationResult.success) {
        const sortedData = [...validationResult.data].sort((a, b) => b.drawNumber - a.drawNumber);
        setValidationStatus("success");
        setValidationMessage("JSON数据有效！请按照以下步骤更新应用数据，或直接同步到Firestore。");
        setValidatedJsonOutput(JSON.stringify(sortedData, null, 2));
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

  const handleSyncDirectlyToFirestore = async () => {
    if (!validatedJsonOutput || adminClaimStatus !== "verified") {
      toast({
        title: "操作无法执行",
        description: "需要有效的JSON数据和已验证的管理员权限才能同步。",
        variant: "destructive",
      });
      return;
    }
    setIsSyncingDirectly(true);
    try {
      const result = await syncHistoricalResultsToFirestore(validatedJsonOutput);
      if (result.success) {
        toast({
          title: "同步成功 (服务器操作)",
          description: result.message,
        });
      } else {
        toast({
          title: "同步失败 (服务器操作)",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error calling syncHistoricalResultsToFirestore:", error);
      toast({
        title: "同步出错 (服务器操作)",
        description: error instanceof Error ? error.message : "发生未知错误。",
        variant: "destructive",
      });
    } finally {
      setIsSyncingDirectly(false);
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
                  注意：管理员声明验证仅与需要特定声明（如 Firestore 规则中的 `request.auth.token.isAdmin == true`）的操作相关。
                </p>
            )}
          </CardContent>
        </Card>
      )}


      <Card className="w-full">
        <CardHeader>
          <CardTitle>管理员：手动更新TOTO开奖结果</CardTitle>
          <CardDescription>
            在此处粘贴新的完整TOTO开奖结果JSON数组。系统将验证数据并提供更新项目文件的说明，或直接同步到 Firestore。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="jsonData" className="text-lg font-semibold">新开奖结果JSON数据</Label>
            <Textarea
              id="jsonData"
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="在此处粘贴JSON数组..."
              rows={15}
              className="mt-2 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              确保数据是一个包含所有历史结果的JSON数组，且每个对象都符合 `HistoricalResult` 结构。建议按 `drawNumber` 降序排列。
            </p>
          </div>

          <Button onClick={handleValidateAndPrepare} className="w-full">
            验证并准备更新指令
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
                disabled={isSyncingDirectly || adminClaimStatus !== 'verified'}
                className="w-full mb-4"
              >
                {isSyncingDirectly ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                同步到 Firestore (服务器操作)
              </Button>
              {adminClaimStatus !== 'verified' && (
                <p className="text-xs text-red-600 text-center -mt-2 mb-3">
                  需要已验证的管理员权限才能同步到 Firestore。
                </p>
              )}

              <h3 className="text-md font-semibold">1. 更新 `src/data/totoResults.json` 文件:</h3>
              <p className="text-sm">复制以下已验证和排序的JSON数据，并用它替换掉 <code>src/data/totoResults.json</code> 文件的全部内容。</p>
              <Textarea
                value={validatedJsonOutput}
                readOnly
                rows={10}
                className="font-mono text-xs bg-white dark:bg-background"
              />
              
              <h3 className="text-md font-semibold mt-4">2. 更新 `src/lib/types.ts` 文件:</h3>
              <p className="text-sm">
                打开 <code>src/lib/types.ts</code> 文件，并进行如下修改：
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                <li>将 <code>MOCK_HISTORICAL_DATA</code> 常量的值替换为上述复制的JSON数据 (在代码中它应该是一个JavaScript数组，而不是JSON字符串)。</li>
                <li>确保 <code>MOCK_LATEST_RESULT</code> 常量指向更新后的 <code>MOCK_HISTORICAL_DATA</code> 数组中的第一个元素 (即最新的开奖结果)。例如: <code>export const MOCK_LATEST_RESULT: HistoricalResult = MOCK_HISTORICAL_DATA[0];</code></li>
              </ul>

              <h3 className="text-md font-semibold mt-4">3. 重启应用:</h3>
              <p className="text-sm">
                为了使这些本地文件更改生效，您需要重新启动您的Next.js开发服务器 (通常是停止并重新运行 <code>npm run dev</code>) 或重新部署您的应用。
              </p>
            </div>
          )}
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">当前模拟数据参考 (来自 src/lib/types.ts)</CardTitle>
              <CardDescription>这是当前硬编码在 <code>src/lib/types.ts</code> 中的 <code>MOCK_HISTORICAL_DATA</code> 内容。</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(MOCK_HISTORICAL_DATA, null, 2)}
                readOnly
                rows={10}
                className="font-mono text-xs bg-muted/30"
              />
            </CardContent>
          </Card>

        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            此页面用于辅助手动更新本地数据文件或通过服务器操作同步到 Firestore。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
    

