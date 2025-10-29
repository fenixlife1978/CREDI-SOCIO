"use client"

import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps } from "recharts"
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore, useMemoFirebase } from "@/firebase";
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
             {payload.map((p, i) => (
              <span key={i} className="font-bold" style={{color: p.color}}>
                {p.name}
              </span>
            ))}
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Total
            </span>
            {payload.map((p, i) => (
                <span key={i} className="font-bold" style={{color: p.color}}>
                    {`$${p.value}`}
                </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};


export function OverviewChart() {
  const firestore = useFirestore();
  const loansQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'loans')) : null),
    [firestore]
  );
  const { data: loans } = useCollection<Loan>(loansQuery);

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
          if (loan.status === 'Finalizado') {
            monthlyData[monthIndex].recovered += loan.totalAmount;
          }
        }
      });
    }

    return monthlyData;
  }, [loans]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <defs>
            <linearGradient id="colorLent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
        <Legend wrapperStyle={{paddingTop: '20px'}}/>
        <Area type="monotone" dataKey="lent" name="Pagado este mes" stroke="hsl(var(--primary))" fill="url(#colorLent)" />
        <Area type="monotone" dataKey="recovered" name="Vencimiento del pago" stroke="hsl(var(--accent))" fill="url(#colorRecovered)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
