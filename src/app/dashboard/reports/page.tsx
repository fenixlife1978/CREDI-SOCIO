'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Partner, Loan, Installment } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, Printer, Landmark, DollarSign, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ title, value, icon, isLoading, className }: { title: string, value: string, icon: React.ReactNode, isLoading: boolean, className?: string }) {
    return (
        <Card className={cn(className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
              ) : (
                <div className="text-2xl font-bold">{value}</div>
              )}
            </CardContent>
        </Card>
    )
}

export default function ReportsPage() {
  const firestore = useFirestore();
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Fetch all partners for the selector
  const partnersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'partners'), orderBy('firstName')) : null), [firestore]);
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);

  // Fetch loans for the selected partner
  const partnerLoansQuery = useMemoFirebase(() => 
    (firestore && selectedPartner) ? query(collection(firestore, 'loans'), where('partnerId', '==', selectedPartner.id), orderBy('startDate', 'desc')) : null,
    [firestore, selectedPartner]
  );
  const { data: partnerLoans, isLoading: loansLoading } = useCollection<Loan>(partnerLoansQuery);

  // Fetch installments for the selected partner
  const partnerInstallmentsQuery = useMemoFirebase(() => 
    (firestore && selectedPartner) ? query(collection(firestore, 'installments'), where('partnerId', '==', selectedPartner.id)) : null,
    [firestore, selectedPartner]
  );
  const { data: partnerInstallments, isLoading: installmentsLoading } = useCollection<Installment>(partnerInstallmentsQuery);

  const loansWithInstallments = useMemo(() => {
    if (!partnerLoans || !partnerInstallments) return [];
    return partnerLoans.map(loan => ({
      ...loan,
      installments: partnerInstallments
        .filter(inst => inst.loanId === loan.id)
        .sort((a, b) => a.installmentNumber - b.installmentNumber),
    }));
  }, [partnerLoans, partnerInstallments]);

  const summaryStats = useMemo(() => {
    if (!partnerLoans || !partnerInstallments) return { totalCapital: 0, totalDebt: 0, activeLoans: 0 };
    
    const activeLoans = partnerLoans.filter(l => l.status === 'Active' || l.status === 'Overdue');

    const totalDebt = partnerInstallments.reduce((acc, inst) => {
        if (inst.status === 'pending' || inst.status === 'overdue') {
            return acc + inst.totalAmount;
        }
        return acc;
    }, 0);
    
    return {
      totalCapital: activeLoans.reduce((acc, loan) => acc + loan.totalAmount, 0),
      totalDebt,
      activeLoans: activeLoans.length,
    }
  }, [partnerLoans, partnerInstallments]);

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const dateFormatter = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "d 'de' LLLL 'de' yyyy", { locale: es });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const handlePrint = () => {
    window.print();
  }
  
  const isLoading = partnersLoading || (selectedPartner && (loansLoading || installmentsLoading));

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center print:hidden">
        <div>
            <h1 className="font-semibold text-lg md:text-2xl">Estado de Cuenta por Socio</h1>
            <p className="text-sm text-muted-foreground">Selecciona un socio para ver su estado de cuenta detallado.</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full sm:w-[250px] justify-between"
              >
                {selectedPartner ? `${selectedPartner.firstName} ${selectedPartner.lastName}` : 'Selecciona un socio...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
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
                        value={`${partner.firstName} ${partner.lastName} ${partner.identificationNumber}`}
                        key={partner.id}
                        onSelect={() => {
                          setSelectedPartner(partner);
                          setPopoverOpen(false);
                        }}
                      >
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
          <Button onClick={handlePrint} disabled={!selectedPartner || isLoading} variant="outline" size="icon">
            <Printer className="h-4 w-4" />
            <span className="sr-only">Imprimir</span>
          </Button>
        </div>
      </div>
      
      {selectedPartner ? (
        <div className="space-y-6">
            <div className="border-b pb-4 mb-4">
                <h2 className="text-2xl font-bold">{`${selectedPartner.firstName} ${selectedPartner.lastName}`}</h2>
                <p className="text-muted-foreground">{selectedPartner.identificationNumber}</p>
            </div>
          
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="Préstamos Activos"
                    value={`${summaryStats.activeLoans}`}
                    icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Capital Total Activo"
                    value={currencyFormatter.format(summaryStats.totalCapital)}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Deuda Pendiente Total"
                    value={currencyFormatter.format(summaryStats.totalDebt)}
                    icon={<Ban className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                    className={summaryStats.totalDebt > 0 ? 'bg-destructive/10 border-destructive/50' : 'bg-green-500/10 border-green-500/50'}
                />
            </div>
            
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}
            
            {!isLoading && loansWithInstallments.map(loan => (
              <Card key={loan.id}>
                <CardHeader>
                  <div className='flex justify-between items-start'>
                    <div>
                        <CardTitle className="text-lg">Préstamo - {currencyFormatter.format(loan.totalAmount)}</CardTitle>
                        <CardDescription>Otorgado el {dateFormatter(loan.startDate)}</CardDescription>
                    </div>
                     <Badge variant={loan.status === 'Finalizado' ? 'secondary' : loan.status === 'Overdue' ? 'destructive' : 'default'}>
                        {loan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Cuota #</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Capital</TableHead>
                        <TableHead className="text-right">Interés</TableHead>
                        <TableHead className="text-right">Monto Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loan.installments.map(installment => (
                        <TableRow key={installment.id}>
                          <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                          <TableCell>{dateFormatter(installment.dueDate)}</TableCell>
                          <TableCell>
                            <Badge variant={installment.status === 'paid' ? 'secondary' : installment.status === 'overdue' ? 'destructive' : 'outline'}>
                              {installment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(installment.capitalAmount)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(installment.interestAmount)}</TableCell>
                          <TableCell className="text-right font-semibold">{currencyFormatter.format(installment.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {loan.installments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            Este préstamo no tiene cuotas definidas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
            {!isLoading && loansWithInstallments.length === 0 && (
                 <Card className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">Este socio no tiene préstamos registrados.</p>
                 </Card>
            )}
        </div>
      ) : (
        <Card className="flex items-center justify-center h-60">
            <p className="text-muted-foreground">Selecciona un socio para comenzar.</p>
        </Card>
      )}

      <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .printable-area, .printable-area * {
                visibility: visible;
            }
            .printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            main {
                padding: 0 !important;
            }
        }
      `}</style>
      <div className="printable-area">
        {selectedPartner && (
            // This content will be shown only for printing
            <div className="hidden print:block p-4">
                 <div className="border-b pb-4 mb-4">
                    <h1 className="text-2xl font-bold">{`Estado de Cuenta: ${selectedPartner.firstName} ${selectedPartner.lastName}`}</h1>
                    <p className="text-sm text-gray-500">{`Cédula: ${selectedPartner.identificationNumber}`}</p>
                    <p className="text-sm text-gray-500">{`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy')}`}</p>
                </div>
                 {!isLoading && loansWithInstallments.map(loan => (
                <div key={loan.id} className="mb-6 page-break-inside-avoid">
                    <div className='flex justify-between items-start mb-2'>
                        <div>
                            <h3 className="text-lg font-semibold">Préstamo - {currencyFormatter.format(loan.totalAmount)}</h3>
                            <p className="text-xs text-gray-500">Otorgado el {dateFormatter(loan.startDate)}</p>
                        </div>
                        <p className={`text-sm font-semibold ${loan.status === 'Finalizado' ? 'text-green-600' : 'text-black'}`}>{loan.status}</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b">
                            <th className="text-left py-1 px-2 font-semibold">Cuota #</th>
                            <th className="text-left py-1 px-2 font-semibold">Vencimiento</th>
                            <th className="text-left py-1 px-2 font-semibold">Estado</th>
                            <th className="text-right py-1 px-2 font-semibold">Capital</th>
                            <th className="text-right py-1 px-2 font-semibold">Interés</th>
                            <th className="text-right py-1 px-2 font-semibold">Monto Total</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loan.installments.map(installment => (
                            <tr key={installment.id} className="border-b">
                            <td className="py-1 px-2">{installment.installmentNumber}</td>
                            <td className="py-1 px-2">{dateFormatter(installment.dueDate)}</td>
                            <td className="py-1 px-2">{installment.status}</td>
                            <td className="text-right py-1 px-2">{currencyFormatter.format(installment.capitalAmount)}</td>
                            <td className="text-right py-1 px-2">{currencyFormatter.format(installment.interestAmount)}</td>
                            <td className="text-right py-1 px-2 font-semibold">{currencyFormatter.format(installment.totalAmount)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}