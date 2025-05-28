
"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Wand2, Loader2, FileText, AlertCircle } from "lucide-react";
import type { WeightedCriterion, TotoCombination } from "@/lib/types";
import { MOCK_HISTORICAL_DATA, OFFICIAL_PREDICTIONS_DRAW_ID } from "@/lib/types"; // Import OFFICIAL_PREDICTIONS_DRAW_ID
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onUsageStatusChange?: (hasUsed: boolean) => void;
}

export function PredictionConfigurator({
  onPredictionsGenerated,
  onLoadingChange,
  onUsageStatusChange
}: PredictionConfiguratorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUsedSmartPickThisDraw, setHasUsedSmartPickThisDraw] = useState<boolean>(false);

  const isAdmin = user && user.email === "admin@totokit.com";

  useEffect(() => {
    if (isAdmin) {
      setHasUsedSmartPickThisDraw(false);
      if (onUsageStatusChange) {
        console.log("[PredictionConfigurator] Admin detected. Notifying parent: onUsageStatusChange(true) for admin.");
        onUsageStatusChange(true);
      }
      return;
    }

    const usageKey = `smartPickUsed_${OFFICIAL_PREDICTIONS_DRAW_ID}_${user?.uid || 'guest'}`;
    const alreadyUsed = localStorage.getItem(usageKey) === 'true';
    console.log(`[PredictionConfigurator] useEffect: User (UID: ${user?.uid || 'guest'}) usageKey: ${usageKey}, alreadyUsed: ${alreadyUsed}`);

    if (alreadyUsed) {
      setHasUsedSmartPickThisDraw(true);
      if (onUsageStatusChange) {
        console.log("[PredictionConfigurator] Notifying parent: onUsageStatusChange(true) due to localStorage usage check.");
        onUsageStatusChange(true);
      }
    } else {
      setHasUsedSmartPickThisDraw(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, OFFICIAL_PREDICTIONS_DRAW_ID]);


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!isAdmin && hasUsedSmartPickThisDraw) {
      toast({
        title: "已使用",
        description: "您已使用本期免费智能选号。",
        variant: "default",
      });
      return;
    }
    if (isAdmin && !user) { // Should not happen if isAdmin is true, but as a safeguard
        toast({ title: "错误", description: "管理员账户未正确识别，请重新登录。", variant: "destructive" });
        return;
    }


    setIsLoading(true);
    onLoadingChange(true);
    if (onUsageStatusChange) {
      console.log("[PredictionConfigurator] handleSubmit: Notifying parent: onUsageStatusChange(true) due to starting generation.");
      onUsageStatusChange(true);
    }

    const latestTenResults = MOCK_HISTORICAL_DATA.slice(0, 10);
    const historicalDataString = JSON.stringify(latestTenResults);
    const weightedCriteria: WeightedCriterion[] = [{ id: "default", name: "GeneralBalance", weight: 0.5 }];

    const result = await generateTotoPredictions(
      historicalDataString,
      weightedCriteria,
      "",
      "",
      10
    );

    setIsLoading(false);
    onLoadingChange(false);

    if ("error" in result) {
      toast({
        title: "预测错误",
        description: result.error,
        variant: "destructive",
      });
      onPredictionsGenerated([]);
    } else if (result.combinations) {
      if (result.combinations.length === 0) {
        toast({
          title: "未生成组合",
          description: "AI无法根据当前参数生成组合。",
          variant: "default",
        });
      } else {
        toast({
          title: "已生成预测！",
          description: `成功生成 ${result.combinations.length} 个组合。`,
        });
      }
      onPredictionsGenerated(result.combinations as TotoCombination[]);

      // Save to localStorage
      try {
        const resultsKey = `smartPickResults_${OFFICIAL_PREDICTIONS_DRAW_ID}_${user?.uid || 'guest'}`;
        localStorage.setItem(resultsKey, JSON.stringify(result.combinations));
        console.log(`[PredictionConfigurator] Smart pick results saved to localStorage key: ${resultsKey}`);
      } catch (e) {
        console.error("Error saving smart pick results to localStorage:", e);
        toast({ title: "保存本地失败", description: "无法将选号结果保存到本地存储。", variant: "destructive" });
      }

      if (!isAdmin) {
        const usageKey = `smartPickUsed_${OFFICIAL_PREDICTIONS_DRAW_ID}_${user?.uid || 'guest'}`;
        console.log(`[PredictionConfigurator] handleSubmit: Setting localStorage usage key ${usageKey} to true for non-admin.`);
        localStorage.setItem(usageKey, 'true');
        setHasUsedSmartPickThisDraw(true);
      }
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardFooter className="pt-6">
          <div className="flex w-full gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || (!isAdmin && hasUsedSmartPickThisDraw) || (isAdmin && !user) }
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              智能选号
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/self-select">
                <FileText className="mr-2 h-4 w-4" />
                自选号码
              </Link>
            </Button>
          </div>
        </CardFooter>
      </form>
      {!isAdmin && hasUsedSmartPickThisDraw && (
        <div className="p-4 pt-0 text-sm">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              您已使用本期免费智能选号。如需更多组号码，请加入会员。
            </AlertDescription>
          </Alert>
        </div>
      )}
       {!isAdmin && !isLoading && !hasUsedSmartPickThisDraw && (
         <div className="p-4 pt-0 text-sm">
           <Alert variant="default">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>提示</AlertTitle>
             <AlertDescription>
               每期可免费使用一次智能选号。
             </AlertDescription>
           </Alert>
         </div>
       )}
        {isAdmin && user && (
            <div className="p-4 pt-0 text-sm">
                <Alert variant="default" className="border-blue-500">
                    <Wand2 className="h-4 w-4 text-blue-500" />
                    <AlertTitle className="text-blue-700">管理员模式</AlertTitle>
                    <AlertDescription>
                        您可以无限制使用智能选号功能。
                    </AlertDescription>
                </Alert>
            </div>
        )}
    </Card>
  );
}
