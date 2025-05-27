
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig, ChevronLeft, ChevronRight } from "lucide-react";
import type { HistoricalResult, AnalysisData } from "@/lib/types";
import { TOTO_NUMBER_RANGE, MOCK_HISTORICAL_DATA } from "@/lib/types";
import { HotColdNumbersChart } from "./charts/HotColdNumbersChart";
import { OddEvenDistributionChart } from "./charts/OddEvenDistributionChart";
import { NumberFrequencyChart } from "./charts/NumberFrequencyChart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [charts, setCharts] = useState<Array<{id: string, component: React.ReactNode}>>([]);

  useEffect(() => {
    const data = processHistoricalData(MOCK_HISTORICAL_DATA);
    setAnalysisData(data);

    const numberFrequencyData = Object.entries(data.hotNumbers.concat(data.coldNumbers).reduce((acc, curr) => {
        acc[curr.number] = curr.frequency;
        return acc;
      }, {} as Record<number, number>))
      .map(([number, frequency]) => ({
        number: parseInt(number),
        frequency: frequency,
      }))
      .sort((a,b) => a.number - b.number);

    setCharts([
      { id: "hotcold", component: <HotColdNumbersChart hotNumbers={data.hotNumbers} coldNumbers={data.coldNumbers} /> },
      { id: "oddeven", component: data.oddEvenRatio.length > 0 ? <OddEvenDistributionChart overallDistribution={data.oddEvenRatio[0]} /> : <p>没有奇偶分布数据。</p> },
      { id: "frequency", component: <NumberFrequencyChart data={numberFrequencyData} /> },
    ]);
  }, []);
  
  const scrollToChart = (index: number) => {
    if (scrollContainerRef.current) {
      const chartWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: chartWidth * index,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const chartWidth = scrollContainerRef.current.offsetWidth;
      const newIndex = Math.round(scrollContainerRef.current.scrollLeft / chartWidth);
      setCurrentIndex(newIndex);
    }
  };
  
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

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChartBig className="h-6 w-6 text-primary" />
          TOTO 数据分析看板
        </CardTitle>
        <CardDescription>
          基于历史数据的TOTO号码模式可视化分析（使用模拟数据）。左右滑动或点击按钮切换图表。
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
          onScroll={handleScroll}
        >
          {charts.map((chart, index) => (
            <div key={chart.id} className="min-w-full snap-start flex-shrink-0 p-1">
              {chart.component}
            </div>
          ))}
        </div>
        
        {/* Navigation Buttons */}
        {charts.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full opacity-50 hover:opacity-100 transition-opacity",
                currentIndex === 0 && "invisible" 
              )}
              onClick={() => scrollToChart(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="上一个图表"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full opacity-50 hover:opacity-100 transition-opacity",
                currentIndex === charts.length - 1 && "invisible"
              )}
              onClick={() => scrollToChart(currentIndex + 1)}
              disabled={currentIndex === charts.length - 1}
              aria-label="下一个图表"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Dots Indicator */}
        {charts.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {charts.map((_, index) => (
              <button
                key={`dot-${index}`}
                onClick={() => scrollToChart(index)}
                aria-label={`切换到图表 ${index + 1}`}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  currentIndex === index ? "bg-primary" : "bg-muted hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}
        
        <p className="mt-6 text-xs text-muted-foreground text-center">
          基于 {MOCK_HISTORICAL_DATA.length} 期历史开奖结果的分析 (模拟数据)。
        </p>
      </CardContent>
    </Card>
  );
}

// Helper to hide scrollbar (add to globals.css or a utility css file if preferred)
// globals.css:
// .no-scrollbar::-webkit-scrollbar {
//   display: none;
// }
// .no-scrollbar {
//   -ms-overflow-style: none;  /* IE and Edge */
//   scrollbar-width: none;  /* Firefox */
// }
// For this example, I will inline it as style for simplicity for now, but globals.css is better.
// Actually, no-scrollbar is better added via a Tailwind plugin or a global CSS.
// For now, I'll rely on the class `no-scrollbar` and assume it will be added to globals.css later.
// I have added `no-scrollbar` class, which is a common utility. If it's not defined, scrollbars might appear.
