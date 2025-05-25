"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface HotColdChartProps {
  hotNumbers: { number: number; frequency: number }[];
  coldNumbers: { number: number; frequency: number }[];
}

export function HotColdNumbersChart({ hotNumbers, coldNumbers }: HotColdChartProps) {
  const chartData = [
    ...hotNumbers.map(item => ({ name: `热${item.number}`, Hot: item.frequency, number: item.number })),
    ...coldNumbers.map(item => ({ name: `冷${item.number}`, Cold: item.frequency, number: item.number })),
  ].sort((a,b) => (a.Hot || 0) > (b.Hot || 0) ? -1 : 1); 

  return (
    <Card>
      <CardHeader>
        <CardTitle>热门和冷门号码</CardTitle>
        <CardDescription>最常出现（热门）和最少出现（冷门）号码的频率。</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={60} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              label={{ value: "号码 (热=热门, 冷=冷门)", position: 'insideBottom', offset: -30, fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              label={{ value: '频率', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number, name: string, props: any) => [`${value} 次 (号码: ${props.payload.number})`, name === 'Hot' ? '热门' : '冷门']}
            />
            <Legend 
              wrapperStyle={{ color: 'hsl(var(--foreground))' }} 
              formatter={(value) => value === 'Hot' ? '热门' : '冷门'}
            />
            <Bar dataKey="Hot" name="热门" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cold" name="冷门" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
