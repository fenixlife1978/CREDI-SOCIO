'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, writeBatch, getDocs, where, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, ShieldCheck, Wrench, FileText, Edit } from 'lucide-react';
import type { Installment, Payment } from '@/lib/data';
import { isBefore, startOfToday, parse } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ValidationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessingOverdue, setIsProcessingOverdue] = useState(false);
  const [isFixingPayments, setIsFixingPayments] = useState(false);
  const [isUpdatingPaymentDate, setIsUpdatingPaymentDate] = useState(false);
  const [fixLogs, setFixLogs] = useState<string[]>([]);
  const [paymentIdToUpdate, setPaymentIdToUpdate] = useState('');
  const [installmentIdToUpdate, setInstallmentIdToUpdate] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');

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

        const paymentRef = doc(firestore, 'payments', paymentIdToUpdate);
        const installmentRef = doc(firestore, 'installments', installmentIdToUpdate);

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
            description: error.message || 'Ocurrió un error. Verifica los IDs y la fecha.',
            variant: 'destructive',
        });
    } finally {
        setIsUpdatingPaymentDate(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Validación de Datos</h1>
      </div>
      
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
          <Button onClick={handleUpdateOverdue} disabled={isProcessingOverdue}>
            {isProcessingOverdue ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {isProcessingOverdue ? 'Procesando...' : 'Actualizar Cuotas Atrasadas'}
          </Button>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Corregir Pagos Históricos</CardTitle>
          <CardDescription>
            Busca pagos antiguos sin desglose de capital/interés y/o con formato de fecha antiguo (DD/MM/YYYY). 
            Calcula el desglose (interés del 4.6%) y estandariza la fecha para asegurar que todos los reportes funcionen correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
           <Button onClick={handleFixPayments} disabled={isFixingPayments}>
            {isFixingPayments ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-4 w-4" />
            )}
            {isFixingPayments ? 'Corrigiendo Pagos...' : 'Iniciar Corrección'}
          </Button>
          {fixLogs.length > 0 && (
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
