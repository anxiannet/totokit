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
        <CardTitle>Number Frequency</CardTitle>
        <CardDescription>Frequency of each number appearing in historical results.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 20, left: 0, bottom: 60 }} // Increased bottom margin for X-axis labels
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="number"
              angle={-60} // Angle labels for better fit
              textAnchor="end"
              interval={0} // Show all labels if possible, Recharts will skip if too crowded
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} // Smaller font size
              height={80} // Increased height for angled labels
              label={{ value: "Number", position: 'insideBottom', offset: -50, fill: 'hsl(var(--foreground))', fontSize: 12 }}
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
              formatter={(value: number, name: string, props: any) => [`Frequency: ${value}`, `Number: ${props.payload.number}`]}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            <Bar dataKey="frequency" name="Frequency" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
