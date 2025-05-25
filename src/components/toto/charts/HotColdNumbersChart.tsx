"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface HotColdChartProps {
  hotNumbers: { number: number; frequency: number }[];
  coldNumbers: { number: number; frequency: number }[];
}

export function HotColdNumbersChart({ hotNumbers, coldNumbers }: HotColdChartProps) {
  const chartData = [
    ...hotNumbers.map(item => ({ name: `H${item.number}`, Hot: item.frequency, number: item.number })),
    ...coldNumbers.map(item => ({ name: `C${item.number}`, Cold: item.frequency, number: item.number })),
  ].sort((a,b) => (a.Hot || 0) > (b.Hot || 0) ? -1 : 1); // Simple sort for display

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hot & Cold Numbers</CardTitle>
        <CardDescription>Frequency of the most (hot) and least (cold) appearing numbers.</CardDescription>
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
              label={{ value: "Number (H=Hot, C=Cold)", position: 'insideBottom', offset: -30, fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number, name: string, props: any) => [`${value} times (Number: ${props.payload.number})`, name]}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            <Bar dataKey="Hot" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cold" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
