'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Payment } from "@/lib/data";

export default function PaymentsPage() {
    const firestore = useFirestore();
    const { data: payments, isLoading } = useCollection<Payment>(
        firestore ? query(collection(firestore, 'payments')) : null
    );
    
    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    const dateFormatter = new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    if (isLoading) {
        return <div>Cargando pagos...</div>
    }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Pagos</h1>
        <Button className="ml-auto" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            Visualiza todos los pagos registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>Préstamo ID</TableHead>
                <TableHead className="hidden md:table-cell">Cuota No.</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead className="hidden md:table-cell">Fecha de Pago</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.partnerName}</TableCell>
                  <TableCell>{payment.loanId}</TableCell>
                  <TableCell className="hidden md:table-cell">{payment.installmentNumber}</TableCell>
                  <TableCell>{currencyFormatter.format(payment.amount)}</TableCell>
                  <TableCell className="hidden md:table-cell">{dateFormatter.format(new Date(payment.paymentDate))}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem>Ver Recibo</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
