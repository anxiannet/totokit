
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChartBig, PieChart, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import type { HistoricalResult, AnalysisData } from "@/lib/types";
import { TOTO_NUMBER_RANGE } from "@/lib/types";
import { HotColdNumbersChart } from "./charts/HotColdNumbersChart";
import { OddEvenDistributionChart } from "./charts/OddEvenDistributionChart";
import { NumberFrequencyChart } from "./charts/NumberFrequencyChart";
import { useQuery } from "@tanstack/react-query";
import { getHistoricalResultsFromFirestore } from "@/services/totoResultsService";
import { MOCK_HISTORICAL_DATA } from "@/lib/types"; // Import fallback

// Function to process historical data for analysis
const processHistoricalData = (data: HistoricalResult[]): AnalysisData => {
  const frequencyMap: Record<number, number> = {};
  for (let i = TOTO_NUMBER_RANGE.min; i <= TOTO_NUMBER_RANGE.max; i++) {
    frequencyMap[i] = 0;
  }

  let totalOdd = 0;
  let totalEven = 0;
  // const oddEvenRatios: { odd: number, even: number, percentage: number }[] = []; // This wasn't used, can be removed or implemented


  data.forEach(result => {
    let currentOdd = 0; // Not used further, can be removed if ratio per draw isn't needed
    let currentEven = 0; // Not used further, can be removed
    result.numbers.forEach(num => {
      frequencyMap[num]++;
      if (num % 2 === 0) {
        totalEven++;
        currentEven++;
      } else {
        totalOdd++;
        currentOdd++;
      }
    });
    // also count additional number for frequency
    if (result.additionalNumber) {
        frequencyMap[result.additionalNumber]++;
         if (result.additionalNumber % 2 === 0) {
            totalEven++;
         } else {
            totalOdd++;
         }
    }
    // if (result.numbers.length > 0) { // This wasn't used
    //     oddEvenRatios.push({odd: currentOdd, even: currentEven, percentage: (currentOdd / result.numbers.length) * 100 });
    // }
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
  
  const { data: historicalData, isLoading, isError, error } = useQuery<HistoricalResult[], Error>({
    queryKey: ["historicalTotoResultsForAnalytics"], // Use a different key if it might conflict
    queryFn: getHistoricalResultsFromFirestore,
    // Fallback to mock data is handled within getHistoricalResultsFromFirestore
    // initialData: MOCK_HISTORICAL_DATA, 
  });

  useEffect(() => {
    if (historicalData) {
      setAnalysisData(processHistoricalData(historicalData));
    }
  }, [historicalData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            正在加载分析...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <p>处理数据中...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError && !analysisData) { // Show error only if no analysisData (i.e. fallback didn't populate it)
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            加载分析数据失败
          </CardTitle>
           <CardDescription>{error?.message || "未知错误"}. 将使用模拟数据进行分析。</CardDescription>
        </CardHeader>
         <CardContent className="flex justify-center items-center h-40">
            <p>无法从服务器获取数据。图表将基于模拟数据。</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysisData && !isLoading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>无数据</CardTitle>
        </CardHeader>
        <CardContent>
          <p>没有可用于分析的数据。</p>
        </CardContent>
      </Card>
    );
  }
  
  // Ensure numberFrequencyData is derived from the current analysisData
  const currentAnalysisData = analysisData || processHistoricalData(MOCK_HISTORICAL_DATA); // Use mock if analysisData is null
  
  const numberFrequencyData = Object.entries(currentAnalysisData.hotNumbers.concat(currentAnalysisData.coldNumbers).reduce((acc, curr) => {
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
          基于历史数据的TOTO号码模式可视化分析。
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
            <HotColdNumbersChart hotNumbers={currentAnalysisData.hotNumbers} coldNumbers={currentAnalysisData.coldNumbers} />
          </TabsContent>
          <TabsContent value="oddeven" className="mt-4">
             {currentAnalysisData.oddEvenRatio.length > 0 ? (
                <OddEvenDistributionChart overallDistribution={currentAnalysisData.oddEvenRatio[0]} />
              ) : (
                <p>没有奇偶分布数据。</p>
              )}
          </TabsContent>
          <TabsContent value="frequency" className="mt-4">
            <NumberFrequencyChart data={numberFrequencyData} />
          </TabsContent>
        </Tabs>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          基于 {historicalData?.length || MOCK_HISTORICAL_DATA.length} 期历史开奖结果的分析。
          {(isLoading || (historicalData && historicalData === MOCK_HISTORICAL_DATA)) && !isError && <span className="text-xs"> (部分数据可能来自模拟)</span>}
        </p>
      </CardContent>
    </Card>
  );
}
