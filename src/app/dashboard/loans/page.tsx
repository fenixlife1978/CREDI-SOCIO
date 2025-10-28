'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, deleteDoc } from "firebase/firestore";
import type { Loan } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AddLoanDialog } from "./add-loan-dialog";

export default function LoansPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  
  const loansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'loans'));
  }, [firestore]);

  const { data: loans, isLoading } = useCollection<Loan>(loansQuery);

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const openDeleteDialog = (loan: Loan) => {
    setLoanToDelete(loan);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!loanToDelete || !firestore) return;
    try {
      const loanDocRef = doc(firestore, 'loans', loanToDelete.id);
      await deleteDoc(loanDocRef);
      toast({
        title: "Préstamo Eliminado",
        description: `El préstamo con ID ${loanToDelete.id} ha sido eliminado.`,
      });
    } catch (error) {
      console.error("Error deleting loan: ", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el préstamo. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAlertOpen(false);
      setLoanToDelete(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="font-semibold text-lg md:text-2xl">Préstamos</h1>
          <div className="ml-auto">
            <AddLoanDialog />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestionar Préstamos</CardTitle>
            <CardDescription>
              Visualiza, edita y gestiona todos los préstamos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead className="hidden md:table-cell">Cuotas</TableHead>
                  <TableHead className="hidden md:table-cell">Interés</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[50px]" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[50px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && loans?.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.partnerName || loan.partnerId}</TableCell>
                    <TableCell>{currencyFormatter.format(loan.totalAmount)}</TableCell>
                    <TableCell className="hidden md:table-cell">{loan.numberOfInstallments}</TableCell>
                    <TableCell className="hidden md:table-cell">{loan.interestRate}%</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === 'Paid Off' ? 'secondary' : loan.status === 'Overdue' ? 'destructive' : 'default'}>
                        {loan.status}
                      </Badge>
                    </TableCell>
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
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDeleteDialog(loan)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && loans?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron préstamos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el préstamo de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
