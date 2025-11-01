
'use client';

import { useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Receipt } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function ReceiptSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>
        </div>
        <Skeleton className="h-20 w-full" />
      </CardContent>
       <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
    </Card>
  );
}


export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const receiptId = params.receiptId as string;
  const printRef = useRef(null);

  const receiptRef = useMemoFirebase(() =>
    (firestore && receiptId) ? doc(firestore, 'receipts', receiptId) : null,
    [firestore, receiptId]
  );
  const { data: receipt, isLoading: receiptLoading } = useDoc<Receipt>(receiptRef);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Recibo-${receipt?.id.slice(-6)}`,
  });

  const isLoading = receiptLoading;

  if (isLoading) {
    return <ReceiptSkeleton />;
  }

  if (!receipt) {
    return (
        <div className="text-center py-10">
            <h2 className="text-xl font-semibold">Recibo no encontrado</h2>
            <p>El recibo que buscas no existe o fue eliminado.</p>
            <Button onClick={() => router.back()} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
        </div>
    );
  }

  return (
     <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6">
        <div className="flex items-center gap-4 print:hidden">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Volver</span>
            </Button>
            <h1 className="font-semibold text-lg md:text-2xl">Detalle del Recibo</h1>
            <Button onClick={handlePrint} className="ml-auto">
                <Printer className="mr-2 h-4 w-4"/>
                Imprimir
            </Button>
        </div>
        
        <div ref={printRef} className="p-2">
            <Card className="w-full max-w-2xl mx-auto shadow-none border-gray-300 print:shadow-none print:border-none">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Asoc. Coop. Transp. La Candelaria R.L.</CardTitle>
                    <p className="text-2xl font-bold">Recibo de Pago</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator />
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold">RECIBO N°:</p>
                            <p className="font-mono text-sm text-muted-foreground">{receipt.id}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-semibold">FECHA:</p>
                             <p>{format(parseISO(receipt.generationDate), "dd 'de' LLLL 'de' yyyy", { locale: es })}</p>
                        </div>
                    </div>
                     <Separator />
                    <div>
                        <p className="font-semibold">RECIBIDO DE:</p>
                        <p>{receipt.partnerName}</p>
                        <p className="text-sm text-muted-foreground">C.I./RIF: {receipt.partnerIdentification}</p>
                    </div>
                    
                    {receipt.type === 'loan_grant' && receipt.loanDetails && (
                        <div>
                             <p className="font-semibold uppercase">POR CONCEPTO DE:</p>
                             <p>Otorgamiento de Préstamo ({receipt.loanDetails.loanType})</p>
                             <div className="mt-4 rounded-md border">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell>Monto del Préstamo</TableCell><TableCell className="text-right">{currencyFormatter.format(receipt.loanDetails.totalAmount)}</TableCell></TableRow>
                                        <TableRow><TableCell>Tasa de Interés</TableCell><TableCell className="text-right">{receipt.loanDetails.interestRate}%</TableCell></TableRow>
                                        <TableRow><TableCell>Número de Cuotas</TableCell><TableCell className="text-right">{receipt.loanDetails.numberOfInstallments}</TableCell></TableRow>
                                        <TableRow className="font-bold bg-muted/50"><TableCell>TOTAL</TableCell><TableCell className="text-right">{currencyFormatter.format(receipt.amount)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                             </div>
                        </div>
                    )}
                    
                     {receipt.type === 'installment_payment' && receipt.installmentDetails && (
                        <div>
                             <p className="font-semibold uppercase">POR CONCEPTO DE:</p>
                             <p>Pago de Cuota N° {receipt.installmentDetails.installmentNumber} del Préstamo ID ...{receipt.loanId.slice(-6)}</p>
                             <div className="mt-4 rounded-md border">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell>Abono a Capital</TableCell><TableCell className="text-right">{currencyFormatter.format(receipt.installmentDetails.capitalAmount)}</TableCell></TableRow>
                                        <TableRow><TableCell>Pago de Intereses</TableCell><TableCell className="text-right">{currencyFormatter.format(receipt.installmentDetails.interestAmount)}</TableCell></TableRow>
                                        <TableRow className="font-bold bg-muted/50"><TableCell>TOTAL PAGADO</TableCell><TableCell className="text-right">{currencyFormatter.format(receipt.amount)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                             </div>
                        </div>
                    )}
                    
                    <div className="pt-10 text-center">
                        <div className="w-48 h-px bg-gray-400 mx-auto" />
                        <p className="text-sm mt-1">Firma y Sello</p>
                    </div>

                </CardContent>
            </Card>
        </div>
     </div>
  );
}
