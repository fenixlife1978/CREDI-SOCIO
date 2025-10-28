'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Loan, Installment } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function LoanDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-24" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                     <div className="space-y-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                             <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const loanId = params.loanId as string;

  const loanRef = useMemoFirebase(() => 
    (firestore && loanId) ? doc(firestore, 'loans', loanId) : null,
    [firestore, loanId]
  );
  const { data: loan, isLoading: loanLoading } = useDoc<Loan>(loanRef);

  const installmentsQuery = useMemoFirebase(() =>
    (firestore && loanId) ? query(collection(firestore, 'installments'), where('loanId', '==', loanId)) : null,
    [firestore, loanId]
  );
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);

  const sortedInstallments = useMemo(() => {
    if (!installments) return [];
    return [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [installments]);
  
  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const dateFormatter = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "d 'de' LLLL 'de' yyyy", { locale: es });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const isLoading = loanLoading || installmentsLoading;
  
  if (isLoading) {
    return <LoanDetailsSkeleton />;
  }

  if (!loan) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Préstamo no encontrado</h2>
        <p>El préstamo que buscas no existe o fue eliminado.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Volver</span>
            </Button>
            <h1 className="font-semibold text-lg md:text-2xl">Detalles del Préstamo</h1>
        </div>
      
        <Card>
            <CardHeader>
                <CardTitle>Préstamo para {loan.partnerName}</CardTitle>
                <CardDescription>ID del Préstamo: {loan.id}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Monto Total</p>
                    <p className="text-lg font-semibold">{currencyFormatter.format(loan.totalAmount)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Otorgamiento</p>
                    <p>{dateFormatter(loan.startDate)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge variant={loan.status === 'Paid Off' ? 'secondary' : loan.status === 'Overdue' ? 'destructive' : 'default'}>
                        {loan.status}
                    </Badge>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Tipo de Préstamo</p>
                    <p className="capitalize">{loan.loanType}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Cuotas</p>
                    <p>{loan.numberOfInstallments}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Tasa de Interés</p>
                    <p>{loan.interestRate}%</p>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Plan de Pagos (Cuotas)</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="relative w-full overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Cuota #</TableHead>
                                <TableHead>Fecha de Vencimiento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Capital</TableHead>
                                <TableHead className="text-right">Interés</TableHead>
                                <TableHead className="text-right">Monto Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedInstallments.map(installment => (
                                <TableRow key={installment.id}>
                                    <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                                    <TableCell>{dateFormatter(installment.dueDate)}</TableCell>
                                    <TableCell>
                                        <Badge variant={installment.status === 'paid' ? 'secondary' : installment.status === 'overdue' ? 'destructive' : 'outline'}>
                                            {installment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{currencyFormatter.format(installment.capitalAmount)}</TableCell>
                                    <TableCell className="text-right">{currencyFormatter.format(installment.interestAmount)}</TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(installment.totalAmount)}</TableCell>
                                </TableRow>
                            ))}
                            {sortedInstallments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Este préstamo no tiene un plan de cuotas definido.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
