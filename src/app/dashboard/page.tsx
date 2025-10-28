'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DollarSign, Landmark, Users, Activity } from "lucide-react"
import { OverviewChart } from "./overview-chart";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Loan, Partner } from "@/lib/data";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ title, value, icon, description, isLoading }: { title: string, value: string, icon: React.ReactNode, description?: string, isLoading: boolean }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{value}</div>
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </>
              )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const firestore = useFirestore();
  
  const loansQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'loans')) : null, 
    [firestore]
  );
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);

  const partnersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'partners')) : null,
    [firestore]
  );
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);

  const activeLoansQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'loans'), where('status', '==', 'Active')) : null,
    [firestore]
  );
  const { data: activeLoans, isLoading: activeLoansLoading } = useCollection<Loan>(activeLoansQuery);

  const { totalLent, totalInterest } = useMemo(() => {
    if (!loans) return { totalLent: 0, totalInterest: 0 };
    return loans.reduce((acc, loan) => {
        const interest = loan.totalAmount * (loan.interestRate / 100);
        acc.totalLent += loan.totalAmount;
        if (loan.status === 'Paid Off') {
            acc.totalInterest += interest;
        }
        return acc;
    }, { totalLent: 0, totalInterest: 0 });
  }, [loans]);

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const isLoading = loansLoading || partnersLoading || activeLoansLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Capital Prestado"
            value={currencyFormatter.format(totalLent)}
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
        />
        <StatCard 
            title="Intereses Ganados"
            value={currencyFormatter.format(totalInterest)}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
        />
        <StatCard 
            title="Socios Activos"
            value={`+${partners?.length ?? 0}`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
        />
        <StatCard 
            title="Préstamos Activos"
            value={`+${activeLoans?.length ?? 0}`}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Visión General</CardTitle>
          <CardDescription>Capital prestado vs. recuperado en los últimos 6 meses.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? <Skeleton className="h-[350px] w-full" /> : <OverviewChart />}
        </CardContent>
      </Card>
    </div>
  )
}
