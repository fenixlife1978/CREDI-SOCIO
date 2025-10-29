'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, writeBatch, getDocs, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, ShieldCheck } from 'lucide-react';
import type { Installment } from '@/lib/data';
import { isBefore, startOfToday } from 'date-fns';

export default function ValidationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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

    setIsProcessing(true);

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
      setIsProcessing(false);
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
      setIsProcessing(false);
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
          <Button onClick={handleUpdateOverdue} disabled={isProcessing}>
            {isProcessing ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? 'Procesando...' : 'Actualizar Cuotas Atrasadas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
