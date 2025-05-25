"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface OddEvenDistributionProps {
  overallDistribution: { odd: number; even: number; percentage: number }; // Percentage refers to odd numbers
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"]; // Blue for Odd, Red for Even

export function OddEvenDistributionChart({ overallDistribution }: OddEvenDistributionProps) {
  const data = [
    { name: "Odd Numbers", value: overallDistribution.odd },
    { name: "Even Numbers", value: overallDistribution.even },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Odd/Even Number Distribution</CardTitle>
        <CardDescription>Overall distribution of odd vs. even numbers in historical results.</CardDescription>
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
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
