
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Payment, Installment } from '@/lib/data';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'LLLL', { locale: es }),
}));

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function ReportSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                 <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                         <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-8 w-1/4" />
            </CardFooter>
        </Card>
    )
}

function PaymentsReportTab() {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const paymentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'payments')) : null),
    [firestore]
  );
  const { data: payments, isLoading } = useCollection<Payment>(paymentsQuery);

  const { filteredPayments, totalAmount } = useMemo(() => {
    if (!payments) return { filteredPayments: [], totalAmount: 0 };
    
    const filtered = payments.filter(p => {
      const paymentDate = parseISO(p.paymentDate);
      return getMonth(paymentDate) === selectedMonth && getYear(paymentDate) === selectedYear;
    });

    const total = filtered.reduce((acc, p) => acc + p.totalAmount, 0);

    return { filteredPayments: filtered, totalAmount: total };
  }, [payments, selectedMonth, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Pagos</CardTitle>
        <CardDescription>Filtra los pagos por mes y año para ver el total recaudado.</CardDescription>
        <div className="flex gap-2 pt-4">
          <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>
                  <span className="capitalize">{month.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Selecciona un año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <ReportSkeleton/> :
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Fecha de Pago</TableHead>
              <TableHead className="text-right">Monto Pagado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.partnerName || payment.partnerId}</TableCell>
                <TableCell>{format(parseISO(payment.paymentDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">{currencyFormatter.format(payment.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No hay pagos registrados para este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>}
      </CardContent>
       {!isLoading && filteredPayments.length > 0 && (
        <CardFooter className="justify-end">
            <div className="text-lg font-semibold">
                Total Recaudado: {currencyFormatter.format(totalAmount)}
            </div>
        </CardFooter>
      )}
    </Card>
  );
}

function UnpaidInstallmentsTab() {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const installmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'installments'), where('status', 'in', ['pending', 'overdue'])) : null),
    [firestore]
  );
  const { data: installments, isLoading } = useCollection<Installment>(installmentsQuery);

  const { filteredInstallments, totalUnpaid } = useMemo(() => {
    if (!installments) return { filteredInstallments: [], totalUnpaid: 0 };
    
    const filtered = installments.filter(i => {
      const dueDate = parseISO(i.dueDate);
      return getMonth(dueDate) === selectedMonth && getYear(dueDate) === selectedYear;
    });

    const total = filtered.reduce((acc, i) => acc + i.totalAmount, 0);

    return { filteredInstallments: filtered, totalUnpaid: total };
  }, [installments, selectedMonth, selectedYear]);

  // Need partner names
  const partnersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'partners') : null), [firestore]);
  const { data: partners } = useCollection(partnersQuery);
  const partnersMap = useMemo(() => {
    if (!partners) return new Map();
    return new Map(partners.map((p: any) => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [partners]);


  return (
     <Card>
      <CardHeader>
        <CardTitle>Reporte de Cuotas No Pagadas</CardTitle>
        <CardDescription>Filtra las cuotas pendientes o atrasadas por mes y año de vencimiento.</CardDescription>
        <div className="flex gap-2 pt-4">
          <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>
                  <span className="capitalize">{month.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Selecciona un año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <ReportSkeleton/> :
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Fecha Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto Pendiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInstallments.map((installment) => (
              <TableRow key={installment.id}>
                <TableCell className="font-medium">{partnersMap.get(installment.partnerId) || installment.partnerId}</TableCell>
                <TableCell>{format(parseISO(installment.dueDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                    <Badge variant={installment.status === 'overdue' ? 'destructive' : 'outline'}>
                        {installment.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">{currencyFormatter.format(installment.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {filteredInstallments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay cuotas sin pagar para este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>}
      </CardContent>
       {!isLoading && filteredInstallments.length > 0 && (
        <CardFooter className="justify-end">
            <div className="text-lg font-semibold">
                Total por Cobrar: {currencyFormatter.format(totalUnpaid)}
            </div>
        </CardFooter>
      )}
    </Card>
  )
}


export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Reportes</h1>
      </div>
      <Tabs defaultValue="payments">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Reporte de Pagos</TabsTrigger>
            <TabsTrigger value="unpaid">Cuotas No Pagadas</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
            <PaymentsReportTab />
        </TabsContent>
        <TabsContent value="unpaid">
            <UnpaidInstallmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
