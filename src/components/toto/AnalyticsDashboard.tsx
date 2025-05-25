"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChartBig, PieChart, TrendingUp } from "lucide-react";
import type { HistoricalResult, AnalysisData } from "@/lib/types";
import { MOCK_HISTORICAL_DATA, TOTO_NUMBER_RANGE } from "@/lib/types";
import { HotColdNumbersChart } from "./charts/HotColdNumbersChart";
import { OddEvenDistributionChart } from "./charts/OddEvenDistributionChart";
import { NumberFrequencyChart } from "./charts/NumberFrequencyChart";

// Function to process historical data for analysis
const processHistoricalData = (data: HistoricalResult[]): AnalysisData => {
  const frequencyMap: Record<number, number> = {};
  for (let i = TOTO_NUMBER_RANGE.min; i <= TOTO_NUMBER_RANGE.max; i++) {
    frequencyMap[i] = 0;
  }

  let totalOdd = 0;
  let totalEven = 0;
  const oddEvenRatios: { odd: number, even: number, percentage: number }[] = [];


  data.forEach(result => {
    let currentOdd = 0;
    let currentEven = 0;
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
    if (result.numbers.length > 0) {
        oddEvenRatios.push({odd: currentOdd, even: currentEven, percentage: (currentOdd / result.numbers.length) * 100 });
    }
  });

  const sortedFrequencies = Object.entries(frequencyMap)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency);

  return {
    hotNumbers: sortedFrequencies.slice(0, 10),
    coldNumbers: sortedFrequencies.slice(-10).reverse(), // least frequent, then reversed to show smallest first
    oddEvenRatio: [{ odd: totalOdd, even: totalEven, percentage: data.length > 0 ? (totalOdd / (totalOdd + totalEven)) * 100 : 0 }],
  };
};


export function AnalyticsDashboard() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [historicalDataUsed, setHistoricalDataUsed] = useState<HistoricalResult[]>(MOCK_HISTORICAL_DATA); // Allow dynamic update later

  useEffect(() => {
    setAnalysisData(processHistoricalData(historicalDataUsed));
  }, [historicalDataUsed]);

  if (!analysisData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Analytics...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Processing data...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Prepare data for NumberFrequencyChart
  const numberFrequencyData = Object.entries(processHistoricalData(historicalDataUsed).hotNumbers.concat(processHistoricalData(historicalDataUsed).coldNumbers).reduce((acc, curr) => {
      acc[curr.number] = curr.frequency;
      return acc;
    }, {} as Record<number, number>))
    .map(([number, frequency]) => ({
      number: parseInt(number),
      frequency: frequency,
    }))
    .sort((a,b) => a.number - b.number); // Sort by number for consistent chart display


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChartBig className="h-6 w-6 text-primary" />
          TOTO Analytics Dashboard
        </CardTitle>
        <CardDescription>
          Visual insights into TOTO number patterns based on historical data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hotcold" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="hotcold">
              <TrendingUp className="mr-2 h-4 w-4" /> Hot & Cold
            </TabsTrigger>
            <TabsTrigger value="oddeven">
              <PieChart className="mr-2 h-4 w-4" /> Odd/Even
            </TabsTrigger>
             <TabsTrigger value="frequency">
              <BarChartBig className="mr-2 h-4 w-4" /> Frequency
            </TabsTrigger>
          </TabsList>
          <TabsContent value="hotcold" className="mt-4">
            <HotColdNumbersChart hotNumbers={analysisData.hotNumbers} coldNumbers={analysisData.coldNumbers} />
          </TabsContent>
          <TabsContent value="oddeven" className="mt-4">
             {analysisData.oddEvenRatio.length > 0 ? (
                <OddEvenDistributionChart overallDistribution={analysisData.oddEvenRatio[0]} />
              ) : (
                <p>No data for Odd/Even distribution.</p>
              )}
          </TabsContent>
          <TabsContent value="frequency" className="mt-4">
            <NumberFrequencyChart data={numberFrequencyData} />
          </TabsContent>
        </Tabs>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Analytics based on {historicalDataUsed.length} past draws. (Currently using mock data)
        </p>
      </CardContent>
    </Card>
  );
}
