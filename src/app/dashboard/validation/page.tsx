'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, writeBatch, getDocs, where, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, ShieldCheck, Wrench, FileText } from 'lucide-react';
import type { Installment, Payment } from '@/lib/data';
import { isBefore, startOfToday } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ValidationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessingOverdue, setIsProcessingOverdue] = useState(false);
  const [isFixingPayments, setIsFixingPayments] = useState(false);
  const [fixLogs, setFixLogs] = useState<string[]>([]);

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
      const dueDate = new Date(inst.dueDate);
      return isBefore(dueDate, today);
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

        querySnapshot.forEach(document => {
            const payment = document.data() as Payment;
            const paymentId = document.id;

            const { totalAmount, capitalAmount, interestAmount } = payment;

            const needsCorrection = !capitalAmount || !interestAmount || isNaN(capitalAmount) || isNaN(interestAmount);
            
            if (needsCorrection) {
                if (totalAmount && !isNaN(totalAmount)) {
                    const newInterest = parseFloat((totalAmount * 0.046).toFixed(2));
                    const newCapital = parseFloat((totalAmount - newInterest).toFixed(2));
                    
                    const paymentRef = doc(firestore, 'payments', paymentId);
                    batch.update(paymentRef, {
                        capitalAmount: newCapital,
                        interestAmount: newInterest
                    });
                    
                    logs.push(`ID: ${paymentId} | Antes: (C: ${capitalAmount}, I: ${interestAmount}) -> Después: (C: ${newCapital}, I: ${newInterest})`);
                    correctedCount++;
                } else {
                     logs.push(`ID: ${paymentId} | OMITIDO: montoTotalPagado no es válido.`);
                }
            }
        });

        if (correctedCount > 0) {
            await batch.commit();
            toast({
                title: 'Corrección Completada',
                description: `Se corrigieron ${correctedCount} documentos de pago.`,
            });
        } else {
            toast({
                title: 'Sin Cambios',
                description: 'No se encontraron documentos de pago que necesitaran corrección.',
            });
        }
        
        setFixLogs(logs);

    } catch (error) {
        console.error('Error fixing payments:', error);
        toast({
            title: 'Error de Corrección',
            description: 'Ocurrió un error al intentar corregir los pagos.',
            variant: 'destructive',
        });
    } finally {
        setIsFixingPayments(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Validación de Datos</h1>
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
          <CardTitle>Corregir Pagos sin Desglose</CardTitle>
          <CardDescription>
            Busca pagos históricos donde falte el desglose de capital e interés y los calcula asumiendo una tasa de interés fija del 4.6%.
            Esta es una herramienta de uso específico para corregir datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
           <Button onClick={handleFixPayments} disabled={isFixingPayments}>
            {isFixingPayments ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-4 w-4" />
            )}
            {isFixingPayments ? 'Corrigiendo Pagos...' : 'Iniciar Corrección de Pagos'}
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
