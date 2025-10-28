'use client';

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, deleteDoc, writeBatch } from "firebase/firestore";
import type { Loan, Partner } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AddLoanDialog } from "./add-loan-dialog";
import * as XLSX from 'xlsx';

export default function LoansPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const loansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'loans'));
  }, [firestore]);

  const partnersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'partners'));
  }, [firestore]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: partners, isLoading: partnersLoading } = useCollection<Partner>(partnersQuery);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !partners) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("El archivo de Excel está vacío o no tiene el formato correcto.");
        }

        const batch = writeBatch(firestore);
        const loansCollectionRef = collection(firestore, 'loans');
        let importedCount = 0;
        let failedCount = 0;

        json.forEach(row => {
          const partnerName = row['Socio'];
          const partner = partners.find(p => `${p.firstName} ${p.lastName}` === partnerName);

          if (partner) {
            const newLoanDocRef = doc(loansCollectionRef);
            
            // Excel dates are numbers, need conversion
            let startDate = new Date().toISOString();
            if(row['Fecha de otorgamiento']){
                if(typeof row['Fecha de otorgamiento'] === 'number') {
                    // It's an Excel date serial number
                    startDate = new Date(Math.round((row['Fecha de otorgamiento'] - 25569) * 864e5)).toISOString();
                } else if(typeof row['Fecha de otorgamiento'] === 'string') {
                    // Assume it's a parseable date string
                    startDate = new Date(row['Fecha de otorgamiento']).toISOString();
                }
            }
            
            const newLoanData = {
              partnerId: partner.id,
              partnerName: partnerName,
              startDate: startDate,
              totalAmount: parseFloat(row['Monto Original'] || 0),
              loanType: (row['Tipo de Préstamo'] || 'standard').toLowerCase(),
              numberOfInstallments: parseInt(row['Plazo (cuotas)'] || 0, 10),
              interestRate: parseFloat(row['Interés'] || 0),
              status: row['Estado'] || 'Active',
            };
            batch.set(newLoanDocRef, newLoanData);
            importedCount++;
          } else {
            failedCount++;
          }
        });
        
        if (importedCount === 0 && failedCount > 0) {
            throw new Error(`No se pudo importar ningún préstamo. ${failedCount} fila(s) no tenían un socio coincidente.`);
        }

        await batch.commit();

        let description = `${importedCount} préstamo(s) importado(s) correctamente.`;
        if (failedCount > 0) {
            description += ` ${failedCount} fila(s) fueron omitidas por no encontrar al socio.`;
        }

        toast({
          title: "Éxito Parcial o Total",
          description: description,
        });

      } catch (error: any) {
        console.error("Error importing loans:", error);
        toast({
          title: "Error al importar",
          description: error.message || "No se pudo procesar el archivo de Excel.",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "No se pudo leer el archivo.",
        variant: "destructive",
      });
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };
  
  const isLoading = loansLoading || partnersLoading;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="font-semibold text-lg md:text-2xl">Préstamos</h1>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".xlsx, .xls, .csv"
            />
            <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
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
