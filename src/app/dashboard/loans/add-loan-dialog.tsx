'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusCircle, Loader, Check, ChevronsUpDown } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import type { Partner, Loan } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const loanSchema = z.object({
  partnerId: z.string({ required_error: 'Debes seleccionar un socio.' }),
  loanType: z.enum(['standard', 'custom'], {
    required_error: 'Debes seleccionar un tipo de préstamo.',
  }),
  totalAmount: z.coerce.number().min(1, 'El monto debe ser mayor a 0.'),
  interestRate: z.coerce.number().min(0, 'La tasa de interés no puede ser negativa.').optional(),
  numberOfInstallments: z.coerce.number().int().min(1, 'Debe haber al menos una cuota.').optional(),
  fixedInterestAmount: z.coerce.number().min(0, 'El monto de interés no puede ser negativo.').optional(),
  hasTerm: z.enum(['yes', 'no']).optional(),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'La fecha de inicio es inválida.',
  }),
}).refine(data => {
  if (data.loanType === 'standard') {
    return data.interestRate !== undefined && data.numberOfInstallments !== undefined;
  }
  if (data.loanType === 'custom') {
    return data.fixedInterestAmount !== undefined && data.hasTerm !== undefined && (data.hasTerm === 'no' || (data.hasTerm === 'yes' && data.numberOfInstallments !== undefined));
  }
  return false;
}, {
  message: "Por favor, completa los campos requeridos para el tipo de préstamo seleccionado.",
  path: ["loanType"],
});


type LoanFormData = z.infer<typeof loanSchema>;

export function AddLoanDialog() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const partnersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'partners') : null),
    [firestore]
  );
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      loanType: 'standard',
      totalAmount: 0,
      interestRate: 0,
      numberOfInstallments: 1,
      fixedInterestAmount: 0,
      hasTerm: 'yes',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const loanType = form.watch('loanType');
  const hasTerm = form.watch('hasTerm');

  const onSubmit = async (data: LoanFormData) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const selectedPartner = partners?.find(p => p.id === data.partnerId);
      
      const loanData: Omit<Loan, 'id' | 'status'> = {
        partnerId: data.partnerId,
        loanType: data.loanType,
        totalAmount: data.totalAmount,
        startDate: new Date(data.startDate).toISOString(),
        partnerName: selectedPartner ? `${selectedPartner.firstName} ${selectedPartner.lastName}` : data.partnerId,
        interestRate: data.interestRate ?? 0,
        numberOfInstallments: data.numberOfInstallments ?? 0,
      };

      await addDoc(collection(firestore, 'loans'), {
        ...loanData,
        status: 'Active',
      });

      toast({
        title: '¡Éxito!',
        description: 'El préstamo ha sido añadido correctamente.',
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error adding loan:', error);
      toast({
        title: 'Error',
        description: 'No se pudo añadir el préstamo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Añadir Préstamo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Préstamo</DialogTitle>
          <DialogDescription>
            Completa la información para registrar un nuevo préstamo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="partnerId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Socio</FormLabel>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value
                            ? partners?.find(p => p.id === field.value)?.firstName + ' ' + partners?.find(p => p.id === field.value)?.lastName
                            : 'Selecciona un socio'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar socio..." />
                        <CommandList>
                          {partnersLoading && <CommandItem>Cargando...</CommandItem>}
                          <CommandEmpty>No se encontraron socios.</CommandEmpty>
                          <CommandGroup>
                            {partners?.map(partner => (
                              <CommandItem
                                value={`${partner.firstName} ${partner.lastName} ${partner.alias || ''} ${partner.identificationNumber || ''}`}
                                key={partner.id}
                                onSelect={() => {
                                  form.setValue('partnerId', partner.id);
                                  setPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    partner.id === field.value ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <p>{`${partner.firstName} ${partner.lastName}`}</p>
                                  <p className='text-xs text-muted-foreground'>{partner.identificationNumber}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loanType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Préstamo</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="standard" />
                        </FormControl>
                        <FormLabel className="font-normal">Estándar</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="custom" />
                        </FormControl>
                        <FormLabel className="font-normal">Personalizado</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Total</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {loanType === 'standard' && (
              <>
                <FormField
                  control={form.control}
                  name="numberOfInstallments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Cuotas</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 12" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tasa de Interés (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 5" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {loanType === 'custom' && (
              <>
                <FormField
                  control={form.control}
                  name="fixedInterestAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto de Interés Fijo</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 100 (o 0 si no hay interés)" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasTerm"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>¿Tiene plazo de pago?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="yes" />
                            </FormControl>
                            <FormLabel className="font-normal">Sí (con cuotas)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="no" />
                            </FormControl>
                            <FormLabel className="font-normal">No (abono libre)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {hasTerm === 'yes' && (
                  <FormField
                    control={form.control}
                    name="numberOfInstallments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Cuotas</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ej: 12" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

             <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Inicio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Préstamo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
