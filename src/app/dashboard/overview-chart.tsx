"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

const data = [
  { name: "Jan", lent: 4000, recovered: 2400 },
  { name: "Feb", lent: 3000, recovered: 1398 },
  { name: "Mar", lent: 2000, recovered: 9800 },
  { name: "Apr", lent: 2780, recovered: 3908 },
  { name: "May", lent: 1890, recovered: 4800 },
  { name: "Jun", lent: 2390, recovered: 3800 },
]

export function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{ 
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--card-foreground))"
          }}
        />
        <Legend />
        <Bar dataKey="lent" name="Capital Prestado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="recovered" name="Capital Recuperado" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
