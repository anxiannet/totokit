"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface NumberFrequencyProps {
  data: { number: number; frequency: number }[];
}

export function NumberFrequencyChart({ data }: NumberFrequencyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>号码频率</CardTitle>
        <CardDescription>历史结果中各号码出现的频率。</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 20, left: 0, bottom: 60 }} 
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="number"
              angle={-60} 
              textAnchor="end"
              interval={0} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
              height={80} 
              label={{ value: "号码", position: 'insideBottom', offset: -50, fill: 'hsl(var(--foreground))', fontSize: 12 }}
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
              formatter={(value: number, name: string, props: any) => [`频率: ${value}`, `号码: ${props.payload.number}`]}
            />
            <Legend 
              wrapperStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value) => value === 'frequency' ? '频率' : value}
            />
            <Bar dataKey="frequency" name="频率" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
