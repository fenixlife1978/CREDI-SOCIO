
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, writeBatch, getDocs, doc } from 'firebase/firestore';
import type { Installment, Partner, Loan } from '@/lib/data';
import { getMonth, getYear, parseISO, format, set, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Loader, CalendarX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'LLLL', { locale: es }),
}));

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);


function InstallmentsTable({
  title,
  installments,
  partnersMap,
  selectedInstallments,
  handleSelectAll,
  handleSelectRow,
  currencyFormatter,
  isLoading
}: {
  title: string;
  installments: Installment[];
  partnersMap: Map<string, string>;
  selectedInstallments: Record<string, boolean>;
  handleSelectAll: (checked: boolean) => void;
  handleSelectRow: (id: string, checked: boolean) => void;
  currencyFormatter: Intl.NumberFormat;
  isLoading: boolean;
}) {
  const totals = useMemo(() => {
    return installments.reduce(
      (acc, inst) => {
        acc.capital += inst.capitalAmount;
        acc.interest += inst.interestAmount;
        acc.total += inst.totalAmount;
        return acc;
      },
      { capital: 0, interest: 0, total: 0 }
    );
  }, [installments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox" className="w-12">
                  <Checkbox
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    checked={
                      installments.length > 0 &&
                      installments.every(inst => selectedInstallments[inst.id])
                    }
                    aria-label="Seleccionar todo"
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
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading && installments.length > 0 &&
                installments.map((installment) => (
                  <TableRow
                    key={installment.id}
                    data-state={selectedInstallments[installment.id] && 'selected'}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedInstallments[installment.id] || false}
                        onCheckedChange={(checked) => handleSelectRow(installment.id, Boolean(checked))}
                        aria-label={`Seleccionar cuota ${installment.installmentNumber}`}
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
              {!isLoading && installments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No hay cuotas en esta categoría.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {!isLoading && installments.length > 0 && (
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
  );
}


export default function RegisterPaymentPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedInstallments, setSelectedInstallments] = useState<Record<string, boolean>>({});
  const [isCleaning, setIsCleaning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const [isCloseMonthAlertOpen, setIsCloseMonthAlertOpen] = useState(false);

  const installmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'installments'), where('status', 'in', ['pending', 'overdue'])) : null),
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

   const loansMap = useMemo(() => {
    if (!loans) return new Map();
    return new Map(loans.map(l => [l.id, l]));
  }, [loans]);

  const { currentMonthInstallments, overdueInstallments } = useMemo(() => {
    if (!installments) return { currentMonthInstallments: [], overdueInstallments: [] };
    
    const startOfSelectedMonth = new Date(selectedYear, selectedMonth, 1);
    
    const current: Installment[] = [];
    const overdue: Installment[] = [];

    installments.forEach(inst => {
      const dueDate = parseISO(inst.dueDate);
      if (inst.status === 'pending' && getMonth(dueDate) === selectedMonth && getYear(dueDate) === selectedYear) {
        current.push(inst);
      } else if (inst.status === 'overdue' || (inst.status === 'pending' && isBefore(dueDate, startOfSelectedMonth))) {
        overdue.push(inst);
      }
    });

    return { 
      currentMonthInstallments: current.sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()), 
      overdueInstallments: overdue.sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()),
    };
  }, [installments, selectedMonth, selectedYear]);

  const handleSelectAllCurrent = (checked: boolean) => {
    const newSelection = { ...selectedInstallments };
    for (const inst of currentMonthInstallments) {
      newSelection[inst.id] = checked;
    }
    setSelectedInstallments(newSelection);
  };
  
  const handleSelectAllOverdue = (checked: boolean) => {
    const newSelection = { ...selectedInstallments };
    for (const inst of overdueInstallments) {
      newSelection[inst.id] = checked;
    }
    setSelectedInstallments(newSelection);
  };
  
  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedInstallments(prev => ({ ...prev, [id]: checked }));
  };

  const handleProcessPayments = async () => {
    if (!firestore || !installments) return;
    
    const installmentIdsToProcess = Object.entries(selectedInstallments)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);

    if (installmentIdsToProcess.length === 0) {
      toast({
        title: "No hay cuotas seleccionadas",
        description: "Por favor, marca las cuotas que deseas procesar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const batch = writeBatch(firestore);
      const installmentsToUpdate = installments.filter(inst => installmentIdsToProcess.includes(inst.id));

      const loanStatusCheck: Record<string, boolean> = {};

      for (const inst of installmentsToUpdate) {
        // Calculate payment date based on user's logic
        const originalDueDate = parseISO(inst.dueDate);
        const paymentDate = set(originalDueDate, {
            month: selectedMonth,
            year: selectedYear
        }).toISOString();
        
        // 1. Mark installment as paid
        const installmentRef = doc(firestore, 'installments', inst.id);
        batch.update(installmentRef, { status: 'paid', paymentDate });

        // 2. Create payment record
        const paymentRef = doc(collection(firestore, 'payments'));
        const partnerName = partnersMap.get(inst.partnerId) || inst.partnerId;
        batch.set(paymentRef, {
            partnerId: inst.partnerId,
            loanId: inst.loanId,
            installmentIds: [inst.id], // One payment record per installment for simplicity
            paymentDate,
            totalAmount: inst.totalAmount,
            capitalAmount: inst.capitalAmount,
            interestAmount: inst.interestAmount,
            partnerName,
        });

        // Mark loan for status check
        loanStatusCheck[inst.loanId] = true;
      }

      // 3. Check if any loans are now fully paid off
      for (const loanId of Object.keys(loanStatusCheck)) {
          const allInstallmentsForLoanQuery = query(collection(firestore, 'installments'), where('loanId', '==', loanId));
          const allInstallmentsForLoanSnapshot = await getDocs(allInstallmentsForLoanQuery);

          const allPaid = allInstallmentsForLoanSnapshot.docs.every(docSnap => {
              const installmentId = docSnap.id;
              // Is it part of the current batch being paid?
              if (installmentIdsToProcess.includes(installmentId)) return true;
              // Or was it already paid before?
              return docSnap.data().status === 'paid';
          });
          
          if (allPaid) {
              const loanRef = doc(firestore, 'loans', loanId);
              batch.update(loanRef, { status: 'Finalizado' });
          }
      }

      await batch.commit();

      toast({
        title: "¡Pagos Procesados!",
        description: `${installmentsToUpdate.length} cuota(s) han sido marcadas como pagadas.`,
      });
      setSelectedInstallments({}); // Clear selection
    } catch (error) {
      console.error("Error processing payments:", error);
      toast({
        title: "Error al Procesar Pagos",
        description: "Ocurrió un error. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const handleCleanOrphanInstallments = async () => {
    if (!firestore) return;
    setIsCleaning(true);

    try {
      const allInstallmentsQuery = query(collection(firestore, 'installments'));
      const allPartnersQuery = query(collection(firestore, 'partners'));
      
      const [installmentsSnapshot, partnersSnapshot] = await Promise.all([
        getDocs(allInstallmentsQuery),
        getDocs(allPartnersQuery),
      ]);

      const existingPartnerIds = new Set(partnersSnapshot.docs.map(doc => doc.id));
      const orphanInstallments = installmentsSnapshot.docs.filter(
        doc => !existingPartnerIds.has(doc.data().partnerId)
      );

      if (orphanInstallments.length === 0) {
        toast({
          title: "Sin cambios",
          description: "No se encontraron cuotas huérfanas para limpiar.",
        });
        setIsCleaning(false);
        return;
      }

      const batch = writeBatch(firestore);
      orphanInstallments.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({
        title: "¡Limpieza Completa!",
        description: `Se eliminaron ${orphanInstallments.length} cuotas huérfanas. La lista se actualizará.`,
      });
      // The useCollection hook should update the list automatically.
    } catch (error) {
      console.error("Error cleaning orphan installments:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al limpiar las cuotas. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!firestore) return;

    // Find unpaid installments from the CURRENT month's table that were NOT selected.
    const unpaidCurrentMonthInstallments = currentMonthInstallments.filter(
      inst => !selectedInstallments[inst.id]
    );

    if (unpaidCurrentMonthInstallments.length === 0) {
      toast({
        title: 'Nada para cerrar',
        description: 'Todas las cuotas del mes actual fueron pagadas o no hay cuotas para este mes.',
      });
      setIsCloseMonthAlertOpen(false);
      return;
    }

    setIsClosingMonth(true);

    try {
      const batch = writeBatch(firestore);
      unpaidCurrentMonthInstallments.forEach(inst => {
        const installmentRef = doc(firestore, 'installments', inst.id);
        batch.update(installmentRef, { status: 'overdue' });
      });

      await batch.commit();

      toast({
        title: '¡Mes Cerrado!',
        description: `${unpaidCurrentMonthInstallments.length} cuota(s) no pagada(s) se marcaron como atrasadas.`,
      });

    } catch (error) {
      console.error("Error closing month:", error);
      toast({
        title: 'Error al Cerrar el Mes',
        description: 'Ocurrió un error. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsClosingMonth(false);
      setIsCloseMonthAlertOpen(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const isLoading = installmentsLoading || partnersLoading || loansLoading;

  return (
    <>
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
        
        <InstallmentsTable
            title={`Cuotas para ${months.find(m => m.value === selectedMonth)?.label} de ${selectedYear}`}
            installments={currentMonthInstallments}
            partnersMap={partnersMap}
            selectedInstallments={selectedInstallments}
            handleSelectAll={handleSelectAllCurrent}
            handleSelectRow={handleSelectRow}
            currencyFormatter={currencyFormatter}
            isLoading={isLoading}
        />

        <InstallmentsTable
            title="Cuotas por pagar Meses Anteriores"
            installments={overdueInstallments}
            partnersMap={partnersMap}
            selectedInstallments={selectedInstallments}
            handleSelectAll={handleSelectAllOverdue}
            handleSelectRow={handleSelectRow}
            currencyFormatter={currencyFormatter}
            isLoading={isLoading}
        />

      <div className="flex justify-between items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCleanOrphanInstallments} disabled={isCleaning}>
            {isCleaning ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Limpiar Cuotas Huérfanas
        </Button>
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button
                variant="destructive"
                onClick={() => setIsCloseMonthAlertOpen(true)}
                disabled={isProcessing || isClosingMonth}
                >
                <CalendarX className="mr-2 h-4 w-4" />
                Cerrar Mes
            </Button>
            <Button 
            onClick={handleProcessPayments}
            disabled={isProcessing || isClosingMonth || Object.values(selectedInstallments).every(v => !v)}
            >
            {isProcessing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Procesar Pagos Seleccionados
            </Button>
        </div>
      </div>
    </div>
    
      <AlertDialog open={isCloseMonthAlertOpen} onOpenChange={setIsCloseMonthAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres cerrar el mes?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará todas las cuotas del mes actual que NO estén seleccionadas como "atrasadas". No podrás revertir esta acción directamente. Las cuotas seleccionadas no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseMonth} disabled={isClosingMonth}>
                {isClosingMonth && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Sí, cerrar mes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
