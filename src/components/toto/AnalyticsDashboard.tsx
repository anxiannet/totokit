
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChartBig, PieChart, TrendingUp } from "lucide-react";
import type { HistoricalResult, AnalysisData } from "@/lib/types";
import { TOTO_NUMBER_RANGE, MOCK_HISTORICAL_DATA } from "@/lib/types";
import { HotColdNumbersChart } from "./charts/HotColdNumbersChart";
import { OddEvenDistributionChart } from "./charts/OddEvenDistributionChart";
import { NumberFrequencyChart } from "./charts/NumberFrequencyChart";

const processHistoricalData = (data: HistoricalResult[]): AnalysisData => {
  const frequencyMap: Record<number, number> = {};
  for (let i = TOTO_NUMBER_RANGE.min; i <= TOTO_NUMBER_RANGE.max; i++) {
    frequencyMap[i] = 0;
  }

  let totalOdd = 0;
  let totalEven = 0;

  data.forEach(result => {
    result.numbers.forEach(num => {
      frequencyMap[num]++;
      if (num % 2 === 0) {
        totalEven++;
      } else {
        totalOdd++;
      }
    });
    if (result.additionalNumber) {
        frequencyMap[result.additionalNumber]++;
         if (result.additionalNumber % 2 === 0) {
            totalEven++;
         } else {
            totalOdd++;
         }
    }
  });

  const sortedFrequencies = Object.entries(frequencyMap)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency);

  return {
    hotNumbers: sortedFrequencies.slice(0, 10),
    coldNumbers: sortedFrequencies.slice(-10).reverse(),
    oddEvenRatio: [{ odd: totalOdd, even: totalEven, percentage: data.length > 0 ? (totalOdd / (totalOdd + totalEven)) * 100 : 0 }],
  };
};


export function AnalyticsDashboard() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  useEffect(() => {
    setAnalysisData(processHistoricalData(MOCK_HISTORICAL_DATA));
  }, []);
  
  if (!analysisData) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>正在加载分析数据...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>处理模拟数据中...</p>
        </CardContent>
      </Card>
    );
  }
  
  const numberFrequencyData = Object.entries(analysisData.hotNumbers.concat(analysisData.coldNumbers).reduce((acc, curr) => {
      acc[curr.number] = curr.frequency;
      return acc;
    }, {} as Record<number, number>))
    .map(([number, frequency]) => ({
      number: parseInt(number),
      frequency: frequency,
    }))
    .sort((a,b) => a.number - b.number); 


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChartBig className="h-6 w-6 text-primary" />
          TOTO 数据分析看板
        </CardTitle>
        <CardDescription>
          基于历史数据的TOTO号码模式可视化分析（使用模拟数据）。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hotcold" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="hotcold">
              <TrendingUp className="mr-2 h-4 w-4" /> 热门和冷门号码
            </TabsTrigger>
            <TabsTrigger value="oddeven">
              <PieChart className="mr-2 h-4 w-4" /> 奇偶分布
            </TabsTrigger>
             <TabsTrigger value="frequency">
              <BarChartBig className="mr-2 h-4 w-4" /> 号码频率
            </TabsTrigger>
          </TabsList>
          <TabsContent value="hotcold" className="mt-4">
            <HotColdNumbersChart hotNumbers={analysisData.hotNumbers} coldNumbers={analysisData.coldNumbers} />
          </TabsContent>
          <TabsContent value="oddeven" className="mt-4">
             {analysisData.oddEvenRatio.length > 0 ? (
                <OddEvenDistributionChart overallDistribution={analysisData.oddEvenRatio[0]} />
              ) : (
                <p>没有奇偶分布数据。</p>
              )}
          </TabsContent>
          <TabsContent value="frequency" className="mt-4">
            <NumberFrequencyChart data={numberFrequencyData} />
          </TabsContent>
        </Tabs>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          基于 {MOCK_HISTORICAL_DATA.length} 期历史开奖结果的分析 (模拟数据)。
        </p>
      </CardContent>
    </Card>
  );
}
