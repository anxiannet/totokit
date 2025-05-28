
"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Wand2, Loader2, FileText, AlertCircle } from "lucide-react";
import type { WeightedCriterion, TotoCombination } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { generateTotoPredictions, saveSmartPickResult } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onUsageStatusChange?: (hasUsed: boolean) => void;
}

const CURRENT_DRAW_ID = "4082"; // Used for localStorage key and Firestore drawId

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
      // For admin, we don't strictly need to call onUsageStatusChange based on localStorage,
      // as they can use it multiple times. However, if the results area should show previously
      // generated (but not necessarily "saved by usage limit") results, this might need adjustment.
      // For now, admin always sees it as "not used" for limit purposes.
      if (onUsageStatusChange && localStorage.getItem(`smartPickUsed_${CURRENT_DRAW_ID}_${user?.uid || 'guest'}`) === 'true') {
         // Even for admin, if there's a record of usage for this specific user/guest, let the parent know.
         // This helps if the parent wants to load *any* previous results.
         console.log("[PredictionConfigurator] Admin detected, but also prior usage in localStorage. Notifying parent.");
         onUsageStatusChange(true);
      }
      return;
    }

    // For non-admins, check usage for this specific user or a guest session
    const usageKey = `smartPickUsed_${CURRENT_DRAW_ID}_${user?.uid || 'guest'}`;
    const alreadyUsed = localStorage.getItem(usageKey) === 'true';
    console.log(`[PredictionConfigurator] useEffect: User (UID: ${user?.uid || 'guest'}) usageKey: ${usageKey}, alreadyUsed: ${alreadyUsed}`);

    if (alreadyUsed) {
      setHasUsedSmartPickThisDraw(true);
      if (onUsageStatusChange) {
        console.log("[PredictionConfigurator] Notifying parent: onUsageStatusChange(true) due to localStorage.");
        onUsageStatusChange(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user]); // Re-run if admin status changes or user logs in/out


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (hasUsedSmartPickThisDraw && !isAdmin) {
      toast({
        title: "已使用",
        description: "您已使用本期免费智能选号。",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    onLoadingChange(true);
    if (onUsageStatusChange) {
      // Always ensure the results area can be shown when generation starts
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

      let idToken: string | null = null;
      if (user) {
        try {
          idToken = await user.getIdToken();
        } catch (tokenError) {
          console.error("Error fetching ID token:", tokenError);
          toast({ title: "获取用户凭证失败", description: "无法保存选号结果，请稍后重试或重新登录。", variant: "destructive"});
        }
      }

      const smartPickData = {
        userId: user ? user.uid : null,
        idToken: idToken,
        drawId: CURRENT_DRAW_ID,
        combinations: result.combinations as TotoCombination[],
      };
      
      saveSmartPickResult(smartPickData)
        .then(saveRes => {
          if (saveRes.success) {
            toast({ title: "选号已保存", description: "您的智能选号结果已成功保存到云端。" });
          } else {
            toast({ title: "保存失败", description: `无法保存选号结果：${saveRes.message || '未知错误'}`, variant: "destructive"});
          }
        })
        .catch(err => {
           toast({ title: "保存出错", description: `保存选号结果时发生错误：${err.message || '未知错误'}`, variant: "destructive"});
        });

      if (!isAdmin) {
        const usageKey = `smartPickUsed_${CURRENT_DRAW_ID}_${user?.uid || 'guest'}`;
        console.log(`[PredictionConfigurator] handleSubmit: Setting localStorage key ${usageKey} to true for non-admin.`);
        localStorage.setItem(usageKey, 'true');
        setHasUsedSmartPickThisDraw(true);
        // onUsageStatusChange already called at the start of handleSubmit
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
              disabled={isLoading || (hasUsedSmartPickThisDraw && !isAdmin)}
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
      {hasUsedSmartPickThisDraw && !isAdmin && (
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
    </Card>
  );
}
