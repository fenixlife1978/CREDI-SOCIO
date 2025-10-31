"use client"

import { useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps } from "recharts"
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Installment } from "@/lib/data";
import { format, parseISO, getMonth, getYear, getDate, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const currencyFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {`Día ${label}`}
            </span>
             {payload.map((p, i) => (
              <span key={i} className="font-bold" style={{color: p.color}}>
                {p.name}
              </span>
            ))}
          </div>
          <div className="flex flex-col space-y-1 text-right">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Total
            </span>
            {payload.map((p, i) => (
                <span key={i} className="font-bold" style={{color: p.color}}>
                    {currencyFormatter.format(p.value as number)}
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
  const paidInstallmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'installments'), where('status', '==', 'paid')) : null),
    [firestore]
  );
  const { data: paidInstallments } = useCollection<Installment>(paidInstallmentsQuery);

  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const numDays = getDaysInMonth(now);

    const dailyData = Array.from({ length: numDays }, (_, i) => ({
      name: (i + 1).toString(),
      "Pagos Recibidos": 0,
      "Intereses Ganados": 0,
    }));

    if (paidInstallments) {
      paidInstallments.forEach(installment => {
        if (!installment.paymentDate) return;
        try {
            const paymentDate = parseISO(installment.paymentDate);
            if (getMonth(paymentDate) === currentMonth && getYear(paymentDate) === currentYear) {
                const dayOfMonth = getDate(paymentDate) - 1; // 0-indexed
                if (dailyData[dayOfMonth]) {
                    dailyData[dayOfMonth]["Pagos Recibidos"] += installment.totalAmount;
                    dailyData[dayOfMonth]["Intereses Ganados"] += installment.interestAmount;
                }
            }
        } catch (e) {
            // Ignore installments with invalid date formats
        }
      });
    }

    return dailyData;
  }, [paidInstallments]);
  
  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact'
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `Día ${value}`}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => currencyFormatter.format(value as number)}
        />
        <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
        />
        <Legend wrapperStyle={{paddingTop: '20px'}}/>
        <Bar dataKey="Pagos Recibidos" fill="hsl(var(--primary))" name="Pagos Recibidos" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Intereses Ganados" fill="hsl(var(--accent))" name="Intereses Ganados" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
