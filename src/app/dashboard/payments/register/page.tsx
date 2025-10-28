'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Installment, Partner, Loan } from '@/lib/data';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'LLLL', { locale: es }),
}));

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

export default function RegisterPaymentPage() {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedInstallments, setSelectedInstallments] = useState<Record<string, boolean>>({});

  const installmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'installments'), where('status', '==', 'pending')) : null),
    [firestore]
  );
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);
  
  const partnersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'partners') : null), [firestore]);
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);
  
  const loansQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'loans') : null), [firestore]);
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);

  const partnersMap = useMemo(() => {
    if (!partners) return new Map();
    return new Map(partners.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [partners]);

  const filteredInstallments = useMemo(() => {
    if (!installments) return [];
    return installments.filter(inst => {
      const dueDate = parseISO(inst.dueDate);
      return getMonth(dueDate) === selectedMonth && getYear(dueDate) === selectedYear;
    });
  }, [installments, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    return filteredInstallments.reduce(
      (acc, inst) => {
        acc.capital += inst.capitalAmount;
        acc.interest += inst.interestAmount;
        acc.total += inst.totalAmount;
        return acc;
      },
      { capital: 0, interest: 0, total: 0 }
    );
  }, [filteredInstallments]);

  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    if (checked) {
      for (const inst of filteredInstallments) {
        newSelection[inst.id] = true;
      }
    }
    setSelectedInstallments(newSelection);
  };
  
  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedInstallments(prev => ({ ...prev, [id]: checked }));
  };

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const isLoading = installmentsLoading || partnersLoading || loansLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-semibold text-lg md:text-2xl">Registrar Pagos por Lista</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona el mes y el año para ver las cuotas pendientes.
          </p>
        </div>
        <div className="flex gap-2 sm:ml-auto">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuotas Pendientes para {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}</CardTitle>
          <CardDescription>Marca las cuotas que han sido pagadas y procesa el pago.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead padding="checkbox" className="w-12">
                    <Checkbox
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                      checked={filteredInstallments.length > 0 && Object.keys(selectedInstallments).length === filteredInstallments.length && Object.values(selectedInstallments).every(v => v)}
                    />
                  </TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead># Cuota</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Interés</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && filteredInstallments.length > 0 && filteredInstallments.map((installment) => (
                  <TableRow
                    key={installment.id}
                    data-state={selectedInstallments[installment.id] && 'selected'}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedInstallments[installment.id] || false}
                        onCheckedChange={(checked) => handleSelectRow(installment.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{partnersMap.get(installment.partnerId) || 'Socio no encontrado'}</TableCell>
                    <TableCell>{installment.installmentNumber}</TableCell>
                    <TableCell>{format(parseISO(installment.dueDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(installment.capitalAmount)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(installment.interestAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{currencyFormatter.format(installment.totalAmount)}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredInstallments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No hay cuotas pendientes para el período seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {!isLoading && filteredInstallments.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold">Totales</TableCell>
                    <TableCell className="text-right font-bold">{currencyFormatter.format(totals.capital)}</TableCell>
                    <TableCell className="text-right font-bold">{currencyFormatter.format(totals.interest)}</TableCell>
                    <TableCell className="text-right font-bold">{currencyFormatter.format(totals.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button disabled={Object.values(selectedInstallments).every(v => !v)}>
          Procesar Pagos Seleccionados
        </Button>
      </div>
    </div>
  );
}
