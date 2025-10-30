'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
  writeBatch,
  doc,
  getDocs,
} from 'firebase/firestore';
import type { Partner, Loan, Installment } from '@/lib/data';

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';


const paymentSchema = z.object({
  partnerId: z.string({ required_error: 'Debes seleccionar un socio.' }).min(1),
  loanId: z.string({ required_error: 'Debes seleccionar un préstamo.' }).min(1),
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'La fecha de pago es inválida.',
  }),
  selectedInstallmentIds: z.array(z.string()).refine(val => val.length > 0, {
    message: "Debes seleccionar al menos una cuota para pagar."
  }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function InstallmentPayment() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  // Data fetching
  const partnersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'partners') : null),
    [firestore]
  );
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      partnerId: '',
      loanId: '',
      selectedInstallmentIds: [],
    },
  });

  const selectedPartnerId = form.watch('partnerId');
  const selectedLoanId = form.watch('loanId');
  const selectedInstallmentIds = form.watch('selectedInstallmentIds');

  const partnerLoansQuery = useMemoFirebase(
    () =>
      firestore && selectedPartnerId
        ? query(
            collection(firestore, 'loans'),
            where('partnerId', '==', selectedPartnerId),
            where('status', 'in', ['Active', 'Overdue'])
          )
        : null,
    [firestore, selectedPartnerId]
  );
  const { data: partnerLoans, isLoading: loansLoading } = useCollection<Loan>(partnerLoansQuery);

  const loanInstallmentsQuery = useMemoFirebase(
     () =>
      firestore && selectedLoanId
        ? query(
            collection(firestore, 'installments'),
            where('loanId', '==', selectedLoanId),
            where('status', 'in', ['pending', 'overdue'])
          )
        : null,
    [firestore, selectedLoanId]
  );
  const { data: loanInstallments, isLoading: installmentsLoading } = useCollection<Installment>(loanInstallmentsQuery);
  
  const sortedInstallments = useMemo(() => {
    if (!loanInstallments) return [];
    return [...loanInstallments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [loanInstallments]);


  // Reset logic
  useEffect(() => {
    form.resetField('loanId');
    form.setValue('selectedInstallmentIds', []);
  }, [selectedPartnerId, form]);

  useEffect(() => {
    form.setValue('selectedInstallmentIds', []);
  }, [selectedLoanId, form]);


  // Calculate total amount
  useEffect(() => {
    const amount = sortedInstallments
        .filter(inst => selectedInstallmentIds.includes(inst.id))
        .reduce((sum, inst) => sum + inst.totalAmount, 0);
    setTotalAmount(amount);
  }, [selectedInstallmentIds, sortedInstallments]);
  
  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!firestore || !loanInstallments) return;

    const installmentsToPay = loanInstallments.filter(inst => data.selectedInstallmentIds.includes(inst.id));

    if (installmentsToPay.length === 0) {
      toast({ title: 'Error', description: 'No hay cuotas seleccionadas.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    const totalCapital = installmentsToPay.reduce((sum, inst) => sum + inst.capitalAmount, 0);
    const totalInterest = installmentsToPay.reduce((sum, inst) => sum + inst.interestAmount, 0);
    const partner = partners?.find(p => p.id === data.partnerId);

    try {
      const batch = writeBatch(firestore);
      const paymentRef = doc(collection(firestore, 'payments'));
      
      // 1. Create one payment record for the whole transaction
      batch.set(paymentRef, {
        partnerId: data.partnerId,
        loanId: data.loanId,
        installmentIds: data.selectedInstallmentIds,
        paymentDate: new Date(data.paymentDate).toISOString(),
        totalAmount: totalAmount,
        capitalAmount: totalCapital,
        interestAmount: totalInterest,
        partnerName: partner ? `${partner.firstName} ${partner.lastName}` : data.partnerId,
        type: 'installment_payment'
      });

      // 2. Update status of each paid installment
      for (const inst of installmentsToPay) {
        const installmentRef = doc(firestore, 'installments', inst.id);
        batch.update(installmentRef, { 
            status: 'paid', 
            paymentDate: new Date(data.paymentDate).toISOString(),
            paymentId: paymentRef.id // Add payment ID to installment
        });
      }

      // 3. Check if the entire loan is now paid off
      const allInstallmentsForLoanQuery = query(collection(firestore, 'installments'), where('loanId', '==', data.loanId));
      const allInstallmentsSnapshot = await getDocs(allInstallmentsForLoanQuery);
      const allDocs = allInstallmentsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

      const isLoanComplete = allDocs.every(
        inst => inst.status === 'paid' || data.selectedInstallmentIds.includes(inst.id)
      );

      if (isLoanComplete) {
        const loanRef = doc(firestore, 'loans', data.loanId);
        batch.update(loanRef, { status: 'Finalizado' });
      }

      await batch.commit();

      toast({
        title: '¡Pago Registrado!',
        description: `Se registró un pago de ${currencyFormatter.format(totalAmount)} cubriendo ${installmentsToPay.length} cuota(s).`,
      });
      
      form.reset({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        partnerId: data.partnerId,
        loanId: data.loanId,
        selectedInstallmentIds: [],
      });

    } catch (error) {
      console.error('Error registering payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el pago. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Pago por Cuota(s)</CardTitle>
        <CardDescription>
          Selecciona un préstamo y luego elige las cuotas específicas que deseas pagar.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Partner and Loan Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Socio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={partnersLoading}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona un socio..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partners?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Préstamo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPartnerId || loansLoading}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona un préstamo..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnerLoans?.map((loan) => (
                          <SelectItem key={loan.id} value={loan.id}>
                            {`Saldo: ${currencyFormatter.format(loan.totalAmount)} | Otorgado: ${format(parseISO(loan.startDate), 'dd/MM/yy')}`}
                          </SelectItem>
                        ))}
                        {!loansLoading && partnerLoans?.length === 0 && <div className="p-2 text-sm text-muted-foreground">Sin préstamos activos.</div>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Installments Table */}
            {selectedLoanId && (
              <Controller
                control={form.control}
                name="selectedInstallmentIds"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Cuotas Pendientes</FormLabel>
                    {installmentsLoading && <p>Cargando cuotas...</p>}
                    {!installmentsLoading && sortedInstallments.length === 0 && <p className="text-sm text-muted-foreground pt-2">Este préstamo no tiene cuotas pendientes.</p>}
                    {!installmentsLoading && sortedInstallments.length > 0 && (
                       <div className={cn("rounded-md border", fieldState.error && "border-destructive")}>
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange(sortedInstallments.map(i => i.id));
                                          } else {
                                            field.onChange([]);
                                          }
                                        }}
                                        checked={
                                          field.value?.length === sortedInstallments.length && sortedInstallments.length > 0
                                        }
                                        aria-label="Seleccionar todo"
                                    />
                                </TableHead>
                                <TableHead>#</TableHead>
                                <TableHead>Vencimiento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedInstallments.map((installment) => (
                                <TableRow key={installment.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={field.value?.includes(installment.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), installment.id])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                  (value) => value !== installment.id
                                                )
                                              );
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>{installment.installmentNumber}</TableCell>
                                    <TableCell>{format(parseISO(installment.dueDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>
                                    <Badge variant={installment.status === 'overdue' ? 'destructive' : 'outline'}>
                                        {installment.status}
                                    </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{currencyFormatter.format(installment.totalAmount)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </div>
                    )}
                     <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
             <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                <FormItem className="max-w-xs">
                    <FormLabel>Fecha del Pago</FormLabel>
                    <FormControl>
                    <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

          </CardContent>
          <CardFooter className="flex justify-between items-center">
             <div className="text-lg font-semibold">
                Total a Pagar: {currencyFormatter.format(totalAmount)}
            </div>
            <Button type="submit" disabled={isSubmitting || totalAmount === 0}>
              {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
