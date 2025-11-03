'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import {
  collection,
  query,
  where,
  writeBatch,
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import type { Partner, Loan } from '@/lib/data';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const paymentSchema = z.object({
  partnerId: z.string({ required_error: 'Debes seleccionar un socio.' }).min(1, 'Debes seleccionar un socio.'),
  loanId: z.string({ required_error: 'Debes seleccionar un préstamo.' }).min(1, 'Debes seleccionar un préstamo.'),
  amount: z.coerce
    .number()
    .min(1, 'El monto del abono debe ser mayor a 0.'),
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'La fecha de pago es inválida.',
  }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function IndividualPayment() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partnersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'partners') : null),
    [firestore]
  );
  const { data: partners, isLoading: partnersLoading } =
    useCollection<Partner>(partnersQuery);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      partnerId: '',
      loanId: '',
    },
  });

  const selectedPartnerId = form.watch('partnerId');

  const partnerLoansQuery = useMemoFirebase(
    () =>
      firestore && selectedPartnerId
        ? query(
            collection(firestore, 'loans'),
            where('partnerId', '==', selectedPartnerId),
            where('status', '==', 'Active')
          )
        : null,
    [firestore, selectedPartnerId]
  );

  const { data: partnerLoans, isLoading: loansLoading } =
    useCollection<Loan>(partnerLoansQuery);
    
  useEffect(() => {
    form.resetField('loanId');
  }, [selectedPartnerId, form]);

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!firestore) return;

    setIsSubmitting(true);
    const { partnerId, loanId, amount, paymentDate } = data;
    const selectedLoan = partnerLoans?.find(l => l.id === loanId);
    
    if (!selectedLoan) {
        toast({ title: 'Error', description: 'El préstamo seleccionado no es válido.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    if (amount > selectedLoan.totalAmount) {
        toast({ title: 'Error', description: 'El monto del abono no puede ser mayor al saldo actual del préstamo.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    try {
        const loanRef = doc(firestore, 'loans', loanId);
        const paymentRef = doc(collection(firestore, 'payments'));
        const partner = partners?.find(p => p.id === partnerId);
        
        const paymentData = {
            partnerId: partnerId,
            loanId: loanId,
            installmentIds: [], // No specific installment
            paymentDate: new Date(paymentDate).toISOString(),
            totalAmount: amount,
            capitalAmount: amount,
            interestAmount: 0, 
            partnerName: partner ? `${partner.firstName} ${partner.lastName}` : partnerId,
            type: 'individual_contribution' as const
        };

        await runTransaction(firestore, async (transaction) => {
            const loanDoc = await transaction.get(loanRef);
            if (!loanDoc.exists()) {
                throw new Error("El documento del préstamo no existe.");
            }

            const currentLoanData = loanDoc.data() as Loan;
            const newBalance = currentLoanData.totalAmount - amount;
            
            // 1. Update loan balance
            transaction.update(loanRef, { 
              totalAmount: newBalance,
              status: newBalance <= 0 ? 'Finalizado' : currentLoanData.status
            });

            // 2. Create payment record
            transaction.set(paymentRef, paymentData);
        });

      toast({
        title: '¡Abono Registrado!',
        description: `Se registró un abono de ${currencyFormatter.format(amount)} al préstamo.`,
      });
      form.reset({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        partnerId: '',
        loanId: '',
        amount: 0,
      });

    } catch (error: any) {
      console.error('Error registering payment:', error);
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `loans/${loanId}`,
        operation: 'write', // runTransaction involves reads and writes
        requestResourceData: { paymentAmount: amount }
      }));

      toast({
        title: 'Error de Permiso',
        description: 'No se pudo registrar el abono. Revisa los permisos.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Abono Individual</CardTitle>
        <CardDescription>
          Aplica un pago a un préstamo sin asociarlo a una cuota específica. Ideal
          para abonos a capital o préstamos sin cuotas.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="partnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Socio</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={partnersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un socio..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {partners?.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {`${partner.firstName} ${partner.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPartnerId && (
              <FormField
                control={form.control}
                name="loanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Préstamo Activo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loansLoading || !partnerLoans || partnerLoans.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loansLoading ? "Cargando préstamos..." : "Selecciona un préstamo..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnerLoans?.map((loan) => (
                          <SelectItem key={loan.id} value={loan.id}>
                            {`ID: ...${loan.id.slice(-5)} | Saldo: ${currencyFormatter.format(loan.totalAmount)} | Tipo: ${loan.loanType}`}
                          </SelectItem>
                        ))}
                        {!loansLoading && partnerLoans?.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground">Este socio no tiene préstamos activos.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a Abonar</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 50000" {...field} disabled={!form.watch('loanId')}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del Abono</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Abono
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
