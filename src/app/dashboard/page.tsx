'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DollarSign, Landmark, Users, CreditCard } from "lucide-react"
import { OverviewChart } from "./overview-chart";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Installment, Partner, Loan } from "@/lib/data";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getMonth, getYear, parseISO } from 'date-fns';

function StatCard({ title, value, icon, description, isLoading, className }: { title: string, value: string, icon: React.ReactNode, description?: string, isLoading: boolean, className?: string }) {
    return (
        <Card className={cn("rounded-2xl", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-3/4 mb-2 bg-white/20" />
                  <Skeleton className="h-4 w-1/2 bg-white/20" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{value}</div>
                  {description && <p className="text-xs text-white/80">{description}</p>}
                </>
              )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const firestore = useFirestore();
  
  const paidInstallmentsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'installments'), where('status', '==', 'paid')) : null, 
    [firestore]
  );
  const { data: paidInstallments, isLoading: installmentsLoading } = useCollection<Installment>(paidInstallmentsQuery);

  const partnersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'partners')) : null,
    [firestore]
  );
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);

  const activeLoansQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'loans'), where('status', 'in', ['Active', 'Overdue'])) : null,
    [firestore]
  );
  const { data: activeLoans, isLoading: activeLoansLoading } = useCollection<Loan>(activeLoansQuery);

  const { monthlyPayments, monthlyInterest } = useMemo(() => {
    if (!paidInstallments) return { monthlyPayments: 0, monthlyInterest: 0 };
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return paidInstallments.reduce((acc, installment) => {
        if (!installment.paymentDate) return acc;
        try {
            const paymentDate = parseISO(installment.paymentDate);
            if (getMonth(paymentDate) === currentMonth && getYear(paymentDate) === currentYear) {
                acc.monthlyPayments += installment.totalAmount;
                acc.monthlyInterest += installment.interestAmount;
            }
        } catch(e) {
            // Ignore invalid dates
        }
        return acc;
    }, { monthlyPayments: 0, monthlyInterest: 0 });
  }, [paidInstallments]);

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const isLoading = installmentsLoading || partnersLoading || activeLoansLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Socios Activos"
            value={`${partners?.length ?? 0}`}
            icon={<Users className="h-5 w-5" />}
            isLoading={isLoading}
            className="bg-primary text-primary-foreground"
        />
        <StatCard 
            title="Préstamos Activos"
            value={`${activeLoans?.length ?? 0}`}
            icon={<Landmark className="h-5 w-5" />}
            isLoading={isLoading}
             className="bg-[#65C466] text-white"
        />
        <StatCard 
            title="Pagos Recibidos (Mes Actual)"
            value={currencyFormatter.format(monthlyPayments)}
            icon={<CreditCard className="h-5 w-5" />}
            isLoading={isLoading}
             className="bg-[#FE5D56] text-white"
        />
        <StatCard 
            title="Intereses Ganados (Mes Actual)"
            value={currencyFormatter.format(monthlyInterest)}
            icon={<DollarSign className="h-5 w-5" />}
            isLoading={isLoading}
            className="bg-[#FDC27A] text-white"
        />
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Visión General</CardTitle>
          <CardDescription>Pagos recibidos vs. intereses ganados en el mes actual.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? <Skeleton className="h-[350px] w-full" /> : <OverviewChart />}
        </CardContent>
      </Card>
    </div>
  )
}
