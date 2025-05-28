
"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Wand2, Loader2, FileText, AlertCircle } from "lucide-react";
import type { WeightedCriterion, TotoCombination } from "@/lib/types";
import { MOCK_HISTORICAL_DATA } from "@/lib/types";
import { generateTotoPredictions } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';

interface PredictionConfiguratorProps {
  onPredictionsGenerated: (predictions: TotoCombination[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onUsageStatusChange?: (hasUsedOrShouldShow: boolean) => void;
  currentDrawId: string; // New prop
}

export function PredictionConfigurator({
  onPredictionsGenerated,
  onLoadingChange,
  onUsageStatusChange,
  currentDrawId, // Use the passed prop
}: PredictionConfiguratorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUsedSmartPickThisDraw, setHasUsedSmartPickThisDraw] = useState<boolean>(false);

  const isAdmin = user && user.email === "admin@totokit.com";
  // const CURRENT_DRAW_ID = "4082"; // No longer hardcoded here

  useEffect(() => {
    if (isAdmin) {
      setHasUsedSmartPickThisDraw(false); 
      if (onUsageStatusChange) {
        console.log("[PredictionConfigurator] Admin detected. Notifying parent: onUsageStatusChange(true) for admin.");
        onUsageStatusChange(true); 
      }
      return;
    }

    const resultsKey = `smartPickResults_${currentDrawId}_${user?.uid || 'guest'}`;
    const usageMarkerKey = `smartPickUsed_${currentDrawId}_${user?.uid || 'guest'}`;
    let validSavedPicksExist = false;
    const savedPicksString = localStorage.getItem(resultsKey);

    if (savedPicksString) {
      try {
        const savedPicks = JSON.parse(savedPicksString) as TotoCombination[];
        if (Array.isArray(savedPicks) && savedPicks.length > 0) {
          validSavedPicksExist = true;
        }
      } catch (e) {
        console.warn("Error parsing saved picks from localStorage on init:", e);
      }
    }
    
    setHasUsedSmartPickThisDraw(validSavedPicksExist);
    console.log(`[PredictionConfigurator] Non-admin: For draw ${currentDrawId}, validSavedPicksExist: ${validSavedPicksExist}. Setting hasUsedSmartPickThisDraw=${validSavedPicksExist}.`);
    
    if (onUsageStatusChange) {
      const usageMarkerSet = localStorage.getItem(usageMarkerKey) === 'true';
      const shouldShowResultsArea = isAdmin || usageMarkerSet || validSavedPicksExist;
      console.log(`[PredictionConfigurator] Notifying parent: onUsageStatusChange(${shouldShowResultsArea}). isAdmin: ${isAdmin}, usageMarkerSet: ${usageMarkerSet}, validSavedPicksExist: ${validSavedPicksExist}`);
      onUsageStatusChange(shouldShowResultsArea);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, currentDrawId]); 

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    if (!isAdmin) {
      const resultsKey = `smartPickResults_${currentDrawId}_${user?.uid || 'guest'}`;
      const savedPicksString = localStorage.getItem(resultsKey);
      if (savedPicksString) {
        try {
          const savedPicks = JSON.parse(savedPicksString) as TotoCombination[];
          if (Array.isArray(savedPicks) && savedPicks.length > 0) {
            toast({
              title: "结果已加载",
              description: "您之前为本期生成的智能选号结果已从本地加载。",
            });
            onPredictionsGenerated(savedPicks); 
            if (onUsageStatusChange) onUsageStatusChange(true); 
            setHasUsedSmartPickThisDraw(true); 
            return;
          }
        } catch (e) {
          console.warn("Error parsing saved picks from localStorage on submit:", e);
        }
      }
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

      try {
        const resultsKey = `smartPickResults_${currentDrawId}_${user?.uid || 'guest'}`;
        localStorage.setItem(resultsKey, JSON.stringify(result.combinations));
        console.log(`[PredictionConfigurator] Smart pick results saved to localStorage key: ${resultsKey}`);
        
        if (!isAdmin) {
          const usageMarkerKey = `smartPickUsed_${currentDrawId}_${user?.uid || 'guest'}`;
          localStorage.setItem(usageMarkerKey, 'true'); 
          setHasUsedSmartPickThisDraw(true); 
        }
      } catch (e) {
        console.error("Error saving smart pick results to localStorage:", e);
        toast({ title: "保存本地失败", description: "无法将选号结果保存到本地存储。", variant: "destructive" });
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
              disabled={isLoading || (!isAdmin && hasUsedSmartPickThisDraw)}
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
