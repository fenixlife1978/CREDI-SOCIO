'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Landmark, Users, Eye } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Partner, Loan, Payment } from "@/lib/data";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";


function StatCard({ title, value, icon, isLoading, className }: { title: string, value: string, icon: React.ReactNode, isLoading: boolean, className?: string }) {
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
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{value}</div>
                </>
              )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const firestore = useFirestore();
  const router = useRouter();

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

  const recentPaymentsQuery = useMemoFirebase(() =>
    firestore 
      ? query(collection(firestore, 'payments'), orderBy('paymentDate', 'desc'), limit(5)) 
      : null,
    [firestore]
  );
  const { data: recentPayments, isLoading: paymentsLoading } = useCollection<Payment>(recentPaymentsQuery);

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const getPaymentTypeLabel = (type: string | undefined) => {
    switch (type) {
        case 'installment_payment':
            return 'Pago de Cuota';
        case 'individual_contribution':
            return 'Abono Individual';
        default:
            return 'Pago';
    }
  }

  const isLoading = partnersLoading || activeLoansLoading || paymentsLoading;

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
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Últimos Pagos Recibidos</CardTitle>
          <CardDescription>Aquí se muestran las transacciones de pago más recientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Socio</TableHead>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead>Tipo de Pago</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="w-[100px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && recentPayments && recentPayments.length > 0 ? (
                    recentPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.partnerName}</TableCell>
                        <TableCell>{format(parseISO(payment.paymentDate), "d 'de' LLLL, yyyy", { locale: es })}</TableCell>
                        <TableCell>
                          <Badge variant={payment.type === 'individual_contribution' ? 'secondary' : 'default'}>
                            {getPaymentTypeLabel(payment.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{currencyFormatter.format(payment.totalAmount)}</TableCell>
                        <TableCell className="text-center">
                           {payment.installmentIds && payment.installmentIds.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/loans/${payment.loanId}`)}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver Préstamo</span>
                            </Button>
                           )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !isLoading && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No se han registrado pagos recientemente.
                            </TableCell>
                        </TableRow>
                    )
                  )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
