
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, writeBatch, getDocs, where, doc, updateDoc, Firestore, getDoc, runTransaction, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, ShieldCheck, Wrench, FileText, Edit, Undo2, Receipt, CalendarCheck, RotateCcw } from 'lucide-react';
import type { Installment, Payment, Loan, Partner } from '@/lib/data';
import { isBefore, startOfToday, parse, isValid, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'LLLL', { locale: es }),
}));
const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);


export default function ValidationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessingOverdue, setIsProcessingOverdue] = useState(false);
  const [isRevertingOverdue, setIsRevertingOverdue] = useState(false);
  const [isFixingPayments, setIsFixingPayments] = useState(false);
  const [isGeneratingReceipts, setIsGeneratingReceipts] = useState(false);
  const [isUpdatingPaymentDate, setIsUpdatingPaymentDate] = useState(false);
  const [isRevertingPayment, setIsRevertingPayment] = useState(false);
  const [isFixingInstallmentDates, setIsFixingInstallmentDates] = useState(false);
  const [fixLogs, setFixLogs] = useState<string[]>([]);
  const [paymentIdToUpdate, setPaymentIdToUpdate] = useState('');
  const [installmentIdToUpdate, setInstallmentIdToUpdate] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [paymentIdToRevert, setPaymentIdToRevert] = useState('');

   // State for ranged revert
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth());
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth());
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [isRevertingByRange, setIsRevertingByRange] = useState(false);


  const pendingInstallmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'installments'), where('status', '==', 'pending')) : null),
    [firestore]
  );
  const { data: pendingInstallments } = useCollection<Installment>(pendingInstallmentsQuery);

  const handleUpdateOverdue = async () => {
    if (!firestore || !pendingInstallments) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuotas pendientes.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingOverdue(true);

    const today = startOfToday();
    const installmentsToUpdate = pendingInstallments.filter(inst => {
      try {
        const dueDate = new Date(inst.dueDate);
        return isBefore(dueDate, today);
      } catch (e) {
        return false;
      }
    });

    if (installmentsToUpdate.length === 0) {
      toast({
        title: 'Sin Cambios',
        description: 'No se encontraron cuotas pendientes para marcar como atrasadas.',
      });
      setIsProcessingOverdue(false);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      installmentsToUpdate.forEach(inst => {
        const instRef = doc(firestore, 'installments', inst.id);
        batch.update(instRef, { status: 'overdue' });
      });

      await batch.commit();

      toast({
        title: '¡Actualización Completa!',
        description: `Se marcaron ${installmentsToUpdate.length} cuota(s) como atrasadas.`,
      });
    } catch (error) {
      console.error('Error updating overdue installments:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al actualizar las cuotas. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingOverdue(false);
    }
  };

  const handleRevertOverdueToPending = async () => {
    if (!firestore) return;
    setIsRevertingOverdue(true);
    
    try {
      const overdueQuery = query(collection(firestore, 'installments'), where('status', '==', 'overdue'));
      const querySnapshot = await getDocs(overdueQuery);
      
      if (querySnapshot.empty) {
        toast({ title: 'Sin Cambios', description: 'No hay cuotas atrasadas para revertir.' });
        setIsRevertingOverdue(false);
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, { status: 'pending' });
      });

      await batch.commit();

      toast({
        title: '¡Reversión Completa!',
        description: `Se han revertido ${querySnapshot.size} cuota(s) de "atrasada" a "pendiente".`,
      });

    } catch (error) {
      console.error('Error reverting overdue installments:', error);
      toast({ title: 'Error', description: 'Ocurrió un error al revertir las cuotas.', variant: 'destructive' });
    } finally {
      setIsRevertingOverdue(false);
    }
  };

  const handleRevertOverdueByRange = async () => {
    if (!firestore) return;
    setIsRevertingByRange(true);

    try {
      const startDate = startOfMonth(new Date(startYear, startMonth));
      const endDate = endOfMonth(new Date(endYear, endMonth));

      if (isBefore(endDate, startDate)) {
        toast({ title: 'Error de Rango', description: 'La fecha de fin no puede ser anterior a la fecha de inicio.', variant: 'destructive' });
        setIsRevertingByRange(false);
        return;
      }

      const overdueQuery = query(
        collection(firestore, 'installments'),
        where('status', '==', 'overdue')
      );

      const querySnapshot = await getDocs(overdueQuery);
      if (querySnapshot.empty) {
        toast({ title: 'Sin Cambios', description: 'No hay cuotas atrasadas para revertir en la base de datos.' });
        setIsRevertingByRange(false);
        return;
      }

      const batch = writeBatch(firestore);
      let revertedCount = 0;

      querySnapshot.forEach(docSnap => {
        const installment = docSnap.data() as Installment;
        const dueDate = parseISO(installment.dueDate);
        if (dueDate >= startDate && dueDate <= endDate) {
          batch.update(docSnap.ref, { status: 'pending' });
          revertedCount++;
        }
      });

      if (revertedCount === 0) {
        toast({ title: 'Sin Cambios', description: 'No se encontraron cuotas atrasadas que coincidieran con el rango de fechas seleccionado.' });
      } else {
        await batch.commit();
        toast({
          title: '¡Reversión Completa!',
          description: `Se han revertido ${revertedCount} cuota(s) de "atrasada" a "pendiente" en el rango seleccionado.`,
        });
      }
    } catch (error) {
      console.error('Error reverting overdue installments by range:', error);
      toast({ title: 'Error', description: 'Ocurrió un error al revertir las cuotas por rango.', variant: 'destructive' });
    } finally {
      setIsRevertingByRange(false);
    }
  };


  const handleGenerateMissingReceipts = async () => {
    if (!firestore) {
      toast({ title: 'Error', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
      return;
    }
    setIsGeneratingReceipts(true);
    
    try {
      const paidInstallmentsQuery = query(
        collection(firestore, 'installments'),
        where('status', '==', 'paid'),
        where('receiptId', '==', null)
      );
      
      const partnersQuery = query(collection(firestore, 'partners'));
      
      const [installmentsSnapshot, partnersSnapshot] = await Promise.all([
        getDocs(paidInstallmentsQuery),
        getDocs(partnersQuery),
      ]);
      
      const partnersMap = new Map(partnersSnapshot.docs.map(doc => [doc.id, doc.data() as Partner]));
      const installmentsToProcess = installmentsSnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Installment[];

      if (installmentsToProcess.length === 0) {
        toast({ title: 'Sin Cambios', description: 'No se encontraron cuotas pagadas sin recibo.' });
        setIsGeneratingReceipts(false);
        return;
      }

      const batch = writeBatch(firestore);
      let receiptsGenerated = 0;

      for (const inst of installmentsToProcess) {
        const partner = partnersMap.get(inst.partnerId);
        const newReceiptRef = doc(collection(firestore, 'receipts'));

        batch.set(newReceiptRef, {
            type: 'installment_payment' as const,
            partnerId: inst.partnerId,
            loanId: inst.loanId,
            paymentId: inst.paymentId,
            installmentId: inst.id,
            generationDate: inst.paymentDate || new Date().toISOString(),
            amount: inst.totalAmount,
            partnerName: partner ? `${partner.firstName} ${partner.lastName}` : inst.partnerId,
            partnerIdentification: partner?.identificationNumber || '',
            installmentDetails: {
                installmentNumber: inst.installmentNumber,
                capitalAmount: inst.capitalAmount,
                interestAmount: inst.interestAmount,
            },
        });
        
        const installmentRef = doc(firestore, 'installments', inst.id);
        batch.update(installmentRef, { receiptId: newReceiptRef.id });
        receiptsGenerated++;
      }

      await batch.commit();

      toast({
        title: '¡Recibos Generados!',
        description: `Se generaron ${receiptsGenerated} nuevos recibos para pagos antiguos.`,
      });

    } catch (error: any) {
      console.error('Error generating missing receipts:', error);
      toast({
        title: 'Error de Generación',
        description: error.message || 'Ocurrió un error al intentar generar los recibos.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReceipts(false);
    }
  };

  const handleFixPayments = async () => {
    if (!firestore) {
        toast({ title: 'Error', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
        return;
    }
    
    setIsFixingPayments(true);
    setFixLogs([]);
    const logs: string[] = [];
    let correctedCount = 0;
    
    try {
        const paymentsQuery = query(collection(firestore, 'payments'));
        const querySnapshot = await getDocs(paymentsQuery);
        const batch = writeBatch(firestore);

        for (const document of querySnapshot.docs) {
            const payment = document.data() as Payment;
            const paymentId = document.id;

            const { totalAmount, capitalAmount, interestAmount, paymentDate } = payment;

            let needsCorrection = false;
            let newPaymentDateISO: string | null = null;
            
            // Date correction logic
            if (typeof paymentDate === 'string' && !paymentDate.includes('T')) {
                // Assuming format DD/MM/YYYY if it's not ISO
                 try {
                    const parsedDate = parse(paymentDate, 'dd/MM/yyyy', new Date());
                    if (!isNaN(parsedDate.getTime())) {
                        newPaymentDateISO = parsedDate.toISOString();
                        needsCorrection = true; // Mark for correction to update the date format
                        logs.push(`ID: ${paymentId} | Fecha convertida: ${paymentDate} -> ${newPaymentDateISO}`);
                    } else {
                         logs.push(`ID: ${paymentId} | OMITIDO: Formato de fecha '${paymentDate}' no reconocido.`);
                         continue; // Skip this document if date is invalid
                    }
                } catch(e) {
                     logs.push(`ID: ${paymentId} | OMITIDO: Error al parsear fecha '${paymentDate}'.`);
                     continue;
                }
            }


            const breakdownMissing = capitalAmount === null || capitalAmount === undefined || isNaN(capitalAmount) || interestAmount === null || interestAmount === undefined || isNaN(interestAmount);

            if (breakdownMissing) {
                needsCorrection = true;
                if (totalAmount && !isNaN(totalAmount)) {
                    const newInterest = parseFloat((totalAmount * 0.046).toFixed(2));
                    const newCapital = parseFloat((totalAmount - newInterest).toFixed(2));
                    
                    const updateData: any = {
                        capitalAmount: newCapital,
                        interestAmount: newInterest
                    };
                    if (newPaymentDateISO) {
                        updateData.paymentDate = newPaymentDateISO;
                    }

                    const paymentRef = doc(firestore, 'payments', paymentId);
                    batch.update(paymentRef, updateData);
                    
                    logs.push(`ID: ${paymentId} | Desglose Antes: (C: ${capitalAmount}, I: ${interestAmount}) -> Después: (C: ${newCapital}, I: ${newInterest})`);
                    correctedCount++;
                } else {
                     logs.push(`ID: ${paymentId} | OMITIDO (desglose): montoTotalPagado no es válido.`);
                }
            } else if (newPaymentDateISO) { // Only date format needs correction
                 const paymentRef = doc(firestore, 'payments', paymentId);
                 batch.update(paymentRef, { paymentDate: newPaymentDateISO });
                 correctedCount++;
                 needsCorrection = true;
            }
        }

        if (correctedCount > 0) {
            await batch.commit();
            toast({
                title: 'Corrección Completada',
                description: `Se corrigieron ${correctedCount} documentos de pago. Los reportes ahora mostrarán los datos actualizados.`,
            });
        } else {
            toast({
                title: 'Sin Cambios',
                description: 'No se encontraron documentos de pago que necesitaran corrección.',
            });
        }
        
        setFixLogs(logs.length > 0 ? logs : ["No se encontraron logs para mostrar."]);

    } catch (error: any) {
        console.error('Error fixing payments:', error);
        toast({
            title: 'Error de Corrección',
            description: error.message || 'Ocurrió un error al intentar corregir los pagos.',
            variant: 'destructive',
        });
    } finally {
        setIsFixingPayments(false);
    }
  };

  const handleUpdatePaymentDate = async () => {
    if (!firestore || !paymentIdToUpdate || !installmentIdToUpdate || !newPaymentDate) {
      toast({
        title: 'Faltan datos',
        description: 'Por favor, proporciona el ID del pago, el ID de la cuota y la nueva fecha.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPaymentDate(true);
    
    try {
        const newDate = new Date(newPaymentDate);
        if (isNaN(newDate.getTime())) {
            throw new Error('La fecha proporcionada no es válida.');
        }
        const newDateISO = newDate.toISOString();

        const paymentRef = doc(firestore, 'payments', paymentIdToUpdate.trim());
        const installmentRef = doc(firestore, 'installments', installmentIdToUpdate.trim());

        const batch = writeBatch(firestore);
        batch.update(paymentRef, { paymentDate: newDateISO });
        batch.update(installmentRef, { paymentDate: newDateISO });
        await batch.commit();
        
        toast({
            title: '¡Fecha Actualizada!',
            description: `Se actualizó la fecha del pago y la cuota a ${newPaymentDate}.`,
        });

        setPaymentIdToUpdate('');
        setInstallmentIdToUpdate('');
        setNewPaymentDate('');

    } catch (error: any) {
        console.error('Error updating payment date:', error);
        toast({
            title: 'Error al Actualizar',
            description: 'No se pudo completar la actualización. ' + (error.message || ''),
            variant: 'destructive',
        });
    } finally {
        setIsUpdatingPaymentDate(false);
    }
  };

  const handleRevertPayment = async () => {
    const sanitizedId = paymentIdToRevert.replace(/[^a-zA-Z0-9]/g, '');
  
    if (!firestore || !sanitizedId) {
      toast({ title: 'Error', description: 'Por favor, proporciona un ID de pago válido.', variant: 'destructive' });
      return;
    }
  
    setIsRevertingPayment(true);
  
    try {
      await runTransaction(firestore, async (transaction) => {
        const paymentRef = doc(firestore, 'payments', sanitizedId);
        const paymentDoc = await transaction.get(paymentRef);
  
        if (!paymentDoc.exists()) {
          throw new Error(`El pago con ID ${sanitizedId} no fue encontrado.`);
        }
  
        const paymentData = paymentDoc.data() as Payment;
        const { installmentIds, loanId } = paymentData;
  
        const installmentDocs = await Promise.all(
          installmentIds.map(id => transaction.get(doc(firestore, 'installments', id)))
        );
  
        let loanDoc: any = null;
        if (loanId) {
          const loanRef = doc(firestore, 'loans', loanId);
          loanDoc = await transaction.get(loanRef);
        }
  
        for (const installmentDoc of installmentDocs) {
          if (installmentDoc.exists()) {
            const installmentData = installmentDoc.data() as Installment;
            const dueDate = new Date(installmentData.dueDate);
            const newStatus = isBefore(dueDate, startOfToday()) ? 'overdue' : 'pending';
            transaction.update(installmentDoc.ref, { status: newStatus, paymentDate: null, paymentId: null, receiptId: null });
          }
        }
  
        if (loanDoc && loanDoc.exists() && loanDoc.data().status === 'Finalizado') {
          transaction.update(loanDoc.ref, { status: 'Active' });
        }
  
        transaction.delete(paymentRef);
      });
  
      toast({
        title: '¡Pago Revertido!',
        description: `El pago ${sanitizedId} ha sido eliminado y las cuotas asociadas han sido restauradas a pendientes.`,
      });
      setPaymentIdToRevert('');
  
    } catch (error: any) {
        console.error('Error reverting payment:', error);
        toast({
            title: 'Error al Revertir',
            description: 'No se pudo completar la reversión: ' + error.message,
            variant: 'destructive',
        });
    } finally {
      setIsRevertingPayment(false);
    }
  };

  const handleFixInstallmentDates = async () => {
    if (!firestore) return;
    setIsFixingInstallmentDates(true);
    setFixLogs([]);
    const logs: string[] = [];
    let correctedCount = 0;
  
    try {
      const installmentsQuery = query(collection(firestore, 'installments'), where('status', '==', 'paid'));
      const querySnapshot = await getDocs(installmentsQuery);
      
      if (querySnapshot.empty) {
        toast({ title: 'Sin Cambios', description: 'No se encontraron cuotas pagadas para procesar.' });
        setIsFixingInstallmentDates(false);
        return;
      }

      const batch = writeBatch(firestore);
  
      for (const document of querySnapshot.docs) {
        const installment = document.data() as Installment;
        const installmentId = document.id;
  
        if (installment.paymentDate && typeof installment.paymentDate === 'string' && !installment.paymentDate.includes('T')) {
          try {
            // Try parsing as dd/MM/yyyy first
            let parsedDate = parse(installment.paymentDate, 'dd/MM/yyyy', new Date());
            
            // If invalid, try ISO without time, which might be the case for `new Date().toISOString().split('T')[0]`
            if (!isValid(parsedDate)) {
               parsedDate = parseISO(installment.paymentDate);
            }
            
            if (isValid(parsedDate)) {
              const newPaymentDateISO = parsedDate.toISOString();
              const installmentRef = doc(firestore, 'installments', installmentId);
              batch.update(installmentRef, { paymentDate: newPaymentDateISO });
              logs.push(`ID Cuota: ${installmentId} | Fecha Corregida: ${installment.paymentDate} -> ${format(parsedDate, 'dd/MM/yyyy')}`);
              correctedCount++;
            } else {
              logs.push(`ID Cuota: ${installmentId} | OMITIDO: Formato de fecha '${installment.paymentDate}' no es válido.`);
            }
          } catch (e) {
            logs.push(`ID Cuota: ${installmentId} | OMITIDO: Error procesando fecha '${installment.paymentDate}'.`);
          }
        }
      }
  
      if (correctedCount > 0) {
        await batch.commit();
        toast({
          title: 'Fechas Corregidas',
          description: `Se corrigieron las fechas de ${correctedCount} cuotas pagadas. Los reportes ahora se mostrarán correctamente.`,
        });
      } else {
        toast({
          title: 'Sin Cambios',
          description: 'No se encontraron cuotas pagadas con formatos de fecha antiguos para corregir.',
        });
      }
  
      setFixLogs(logs.length > 0 ? logs : ["No se encontraron logs para mostrar."]);
  
    } catch (error: any) {
      console.error('Error fixing installment dates:', error);
      toast({
        title: 'Error de Corrección',
        description: error.message || 'Ocurrió un error al intentar corregir las fechas de las cuotas.',
        variant: 'destructive',
      });
    } finally {
      setIsFixingInstallmentDates(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Validación y Mantenimiento de Datos</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Marcar Cuotas Atrasadas</CardTitle>
          <CardDescription>
            Este proceso revisará todas las cuotas con estado "pendiente" y las marcará como "atrasadas" si su fecha de vencimiento ya pasó.
            Es recomendable ejecutar este proceso periódicamente para mantener los datos actualizados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">
            Actualmente hay <span className="font-bold text-foreground">{pendingInstallments?.length ?? 0}</span> cuota(s) pendientes por revisar.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleUpdateOverdue} disabled={isProcessingOverdue || isRevertingOverdue}>
              {isProcessingOverdue ? ( <Loader className="mr-2 h-4 w-4 animate-spin" /> ) : ( <ShieldCheck className="mr-2 h-4 w-4" /> )}
              {isProcessingOverdue ? 'Procesando...' : 'Actualizar Cuotas Atrasadas'}
            </Button>
            <Button variant="outline" onClick={handleRevertOverdueToPending} disabled={isProcessingOverdue || isRevertingOverdue}>
                {isRevertingOverdue ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                {isRevertingOverdue ? 'Revirtiendo...' : 'Revertir Todas a Pendientes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revertir Cuotas Atrasadas por Rango</CardTitle>
          <CardDescription>
            Si marcaste cuotas como "atrasadas" por error en un periodo específico, puedes revertirlas a "pendientes" aquí.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="grid gap-1.5">
              <Label>Fecha de Inicio</Label>
              <div className="flex gap-2">
                <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(Number(v))}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}><span className="capitalize">{m.label}</span></SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(startYear)} onValueChange={(v) => setStartYear(Number(v))}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha de Fin</Label>
              <div className="flex gap-2">
                <Select value={String(endMonth)} onValueChange={(v) => setEndMonth(Number(v))}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}><span className="capitalize">{m.label}</span></SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(endYear)} onValueChange={(v) => setEndYear(Number(v))}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleRevertOverdueByRange} disabled={isRevertingByRange}>
              {isRevertingByRange ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isRevertingByRange ? 'Revirtiendo...' : 'Revertir en Rango'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Generar Recibos Faltantes</CardTitle>
            <CardDescription>
            Esta herramienta busca cuotas pagadas que no tienen un recibo asociado y los genera retroactivamente.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleGenerateMissingReceipts} disabled={isGeneratingReceipts}>
                {isGeneratingReceipts ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                {isGeneratingReceipts ? 'Generando...' : 'Generar Recibos para Pagos Antiguos'}
            </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revertir Pago</CardTitle>
          <CardDescription>
            Si un pago se registró por error, puedes revertirlo aquí. Esto eliminará el registro del pago y devolverá la(s) cuota(s) asociadas a un estado pendiente/atrasada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="paymentIdRevert">ID del Pago a Revertir</Label>
                <Input id="paymentIdRevert" type="text" placeholder="Pega el ID del documento 'payments'" value={paymentIdToRevert} onChange={(e) => setPaymentIdToRevert(e.target.value)} />
            </div>
          <Button onClick={handleRevertPayment} disabled={isRevertingPayment} variant="destructive">
            {isRevertingPayment ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="mr-2 h-4 w-4" />
            )}
            {isRevertingPayment ? 'Revirtiendo...' : 'Revertir Pago'}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Corregir Fecha de Pago</CardTitle>
          <CardDescription>
            Si registraste un pago con una fecha incorrecta, puedes corregirlo aquí. Necesitarás los IDs del documento de "pago" y de la "cuota" desde Firebase.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="paymentId">ID del Pago</Label>
                <Input id="paymentId" type="text" placeholder="ID del documento en la colección 'payments'" value={paymentIdToUpdate} onChange={(e) => setPaymentIdToUpdate(e.target.value)} />
            </div>
             <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="installmentId">ID de la Cuota</Label>
                <Input id="installmentId" type="text" placeholder="ID del documento en la colección 'installments'" value={installmentIdToUpdate} onChange={(e) => setInstallmentIdToUpdate(e.target.value)} />
            </div>
             <div className="grid w-full max-w-xs items-center gap-1.5">
                <Label htmlFor="newDate">Nueva Fecha de Pago</Label>
                <Input id="newDate" type="date" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} />
            </div>
          <Button onClick={handleUpdatePaymentDate} disabled={isUpdatingPaymentDate}>
            {isUpdatingPaymentDate ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Edit className="mr-2 h-4 w-4" />
            )}
            {isUpdatingPaymentDate ? 'Corrigiendo...' : 'Corregir Fecha'}
          </Button>
        </CardContent>
      </Card>

      <Card>
            <CardHeader>
                <CardTitle>Corregir Fechas de Pago en Cuotas</CardTitle>
                <CardDescription>
                Esta herramienta busca cuotas pagadas cuya fecha de pago (`paymentDate`) esté en un formato de texto no estándar (ej. DD/MM/YYYY) y la convierte al formato ISO requerido por los reportes. Ejecuta esto si los reportes no muestran pagos antiguos.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
                <Button onClick={handleFixInstallmentDates} disabled={isFixingInstallmentDates}>
                    {isFixingInstallmentDates ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
                    {isFixingInstallmentDates ? 'Corrigiendo...' : 'Corregir Fechas de Cuotas'}
                </Button>
                 {fixLogs.length > 0 && isFixingInstallmentDates === false && (
                    <div className="w-full mt-4">
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Log de Corrección:</h3>
                        <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/50">
                            <pre className="text-xs whitespace-pre-wrap">
                            {fixLogs.join('\n')}
                            </pre>
                        </ScrollArea>
                    </div>
                 )}
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Corregir Pagos Históricos (Desglose)</CardTitle>
          <CardDescription>
            Busca pagos antiguos sin desglose de capital/interés. 
            Calcula el desglose (interés del 4.6%) para asegurar que todos los reportes funcionen correctamente. 
            Esta herramienta es menos relevante si los reportes ya funcionan bien.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
           <Button onClick={handleFixPayments} disabled={isFixingPayments}>
            {isFixingPayments ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-4 w-4" />
            )}
            {isFixingPayments ? 'Corrigiendo Pagos...' : 'Iniciar Corrección de Desglose'}
          </Button>
          {fixLogs.length > 0 && isFixingPayments === false && (
            <div className="w-full mt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Log de Corrección:</h3>
              <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/50">
                <pre className="text-xs whitespace-pre-wrap">
                  {fixLogs.join('\n')}
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

