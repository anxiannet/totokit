"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface OddEvenDistributionProps {
  overallDistribution: { odd: number; even: number; percentage: number }; 
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"]; 

export function OddEvenDistributionChart({ overallDistribution }: OddEvenDistributionProps) {
  const data = [
    { name: "奇数", value: overallDistribution.odd },
    { name: "偶数", value: overallDistribution.even },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>奇偶数分布</CardTitle>
        <CardDescription>历史结果中奇数与偶数的总体分布。</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Legend 
              wrapperStyle={{ color: 'hsl(var(--foreground))' }} 
              formatter={(value) => value === 'Odd Numbers' ? '奇数' : (value === 'Even Numbers' ? '偶数' : value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
