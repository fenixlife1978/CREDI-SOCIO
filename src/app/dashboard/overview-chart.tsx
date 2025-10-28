"use client"

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps } from "recharts"
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Loan } from "@/lib/data";
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].name}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[1].name}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Total
            </span>
            <span className="font-bold">
              {`$${payload[0].value}`}
            </span>
            <span className="font-bold">
              {`$${payload[1].value}`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};


export function OverviewChart() {
  const firestore = useFirestore();
  const { data: loans } = useCollection<Loan>(
    firestore ? query(collection(firestore, 'loans')) : null
  );

  const data = useMemo(() => {
    const now = new Date();
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(now, 5 - i);
      return {
        name: format(date, 'MMM', { locale: es }),
        lent: 0,
        recovered: 0,
      };
    });

    if (loans) {
      loans.forEach(loan => {
        const loanDate = new Date(loan.startDate);
        const monthIndex = 5 - (now.getMonth() - loanDate.getMonth() + 12 * (now.getFullYear() - loanDate.getFullYear()));

        if (monthIndex >= 0 && monthIndex < 6) {
          monthlyData[monthIndex].lent += loan.totalAmount;
          if (loan.status === 'Paid Off') {
            monthlyData[monthIndex].recovered += loan.totalAmount;
          }
        }
      });
    }

    return monthlyData;
  }, [loans]);

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
            content={<CustomTooltip />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
        />
        <Legend />
        <Bar dataKey="lent" name="Capital Prestado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="recovered" name="Capital Recuperado" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
