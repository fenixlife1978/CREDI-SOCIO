
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Receipt } from '@/lib/data';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, Search } from 'lucide-react';


const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function ReceiptsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const receiptsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'receipts')) : null),
    [firestore]
  );
  const { data: receipts, isLoading } = useCollection<Receipt>(receiptsQuery);

  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];
    const sorted = [...receipts].sort((a, b) => parseISO(b.generationDate).getTime() - parseISO(a.generationDate).getTime());
    if (!searchTerm) return sorted;

    const lowercasedTerm = searchTerm.toLowerCase();
    return sorted.filter(receipt =>
      receipt.partnerName?.toLowerCase().includes(lowercasedTerm) ||
      receipt.partnerIdentification?.toLowerCase().includes(lowercasedTerm) ||
      receipt.id.toLowerCase().includes(lowercasedTerm)
    );
  }, [receipts, searchTerm]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Recibos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestionar Recibos</CardTitle>
          <CardDescription>
            Busca y visualiza todos los recibos generados por otorgamiento de préstamos y pagos de cuotas.
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por socio, cédula o ID de recibo..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Recibo</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Fecha de Generación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-xs">...{receipt.id.slice(-8)}</TableCell>
                      <TableCell className="font-medium">{receipt.partnerName}</TableCell>
                      <TableCell>{format(parseISO(receipt.generationDate), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={receipt.type === 'loan_grant' ? 'secondary' : 'default'}>
                          {receipt.type === 'loan_grant' ? 'Otorgamiento' : 'Pago de Cuota'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{currencyFormatter.format(receipt.amount)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/receipts/${receipt.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver Recibo</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron recibos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
