'use client';

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2, Upload, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, deleteDoc, writeBatch } from "firebase/firestore";
import type { Loan, Partner } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AddLoanDialog } from "./add-loan-dialog";
import * as XLSX from 'xlsx';
import { format, parseISO, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from "next/navigation";

export default function LoansPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
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

  const sortedLoans = useMemo(() => {
    if (!loans) return [];
    return [...loans].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [loans]);

  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const dateFormatter = (dateString: string) => {
    try {
      return format(parseISO(dateString), "d 'de' LLLL 'de' yyyy", { locale: es });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const openDeleteDialog = (loan: Loan) => {
    setLoanToDelete(loan);
    setIsAlertOpen(true);
  };
  
  const openEditDialog = (loan: Loan) => {
    setLoanToEdit(loan);
    setIsLoanDialogOpen(true);
  };

  const openNewDialog = () => {
    setLoanToEdit(null);
    setIsLoanDialogOpen(true);
  };


  const handleDeleteConfirm = async () => {
    if (!loanToDelete || !firestore) return;
    try {
      const loanDocRef = doc(firestore, 'loans', loanToDelete.id);
      await deleteDoc(loanDocRef);
      // TODO: Also delete related installments
      toast({
        title: "Préstamo Eliminado",
        description: `El préstamo ha sido eliminado.`,
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
        const installmentsRef = collection(firestore, 'installments');
        let importedCount = 0;
        let failedCount = 0;

        for (const row of json) {
          const partnerName = row['Socio'];
          const partner = partners.find(p => `${p.firstName} ${p.lastName}` === partnerName);

          if (partner) {
            const newLoanDocRef = doc(loansCollectionRef);
            
            let startDate = new Date();
            const excelDate = row['Fecha de otorgamiento'];

            if(excelDate){
                if(typeof excelDate === 'number') {
                    startDate = new Date(Math.round((excelDate - 25569) * 864e5));
                } else if(typeof excelDate === 'string') {
                    const parts = excelDate.split('/');
                    if (parts.length === 3) {
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const year = parseInt(parts[2], 10);
                      const date = new Date(year, month, day);
                      if (!isNaN(date.getTime())) {
                          startDate = date;
                      }
                    } else {
                        const date = new Date(excelDate);
                        if (!isNaN(date.getTime())) {
                            startDate = date;
                        }
                    }
                }
            }

            const getInterestRate = () => {
              const interestKeys = ['Interés', 'interes', 'tasa', 'Tasa de Interés'];
              for (const key of interestKeys) {
                if (row[key] !== undefined) {
                  const rate = parseFloat(row[key]);
                  return isNaN(rate) ? 0 : rate;
                }
              }
              return 0;
            };
            
            const loanData = {
              partnerId: partner.id,
              partnerName: partnerName,
              startDate: startDate.toISOString(),
              totalAmount: parseFloat(row['Monto Original'] || 0),
              loanType: (row['Tipo de Préstamo'] || 'standard').toLowerCase() as 'standard' | 'custom',
              numberOfInstallments: parseInt(row['Plazo (cuotas)'] || '0', 10),
              interestRate: getInterestRate(),
              fixedInterestAmount: parseFloat(row['Interes Fijo'] || '0'),
              status: row['Estado'] || 'Active',
            };
            batch.set(newLoanDocRef, loanData);

            // Generate installments
            const termDuration = loanData.numberOfInstallments;
            if (termDuration > 0) {
              const capitalPerInstallment = loanData.totalAmount / termDuration;
              let interestPerInstallment = 0;

              if (loanData.loanType === 'standard') {
                interestPerInstallment = loanData.totalAmount * (loanData.interestRate / 100);
              } else { // custom
                interestPerInstallment = loanData.fixedInterestAmount || 0;
              }

              const totalPerInstallment = capitalPerInstallment + interestPerInstallment;
              
              for (let i = 1; i <= termDuration; i++) {
                const installmentDocRef = doc(installmentsRef);
                const dueDate = addMonths(startDate, i);
                
                batch.set(installmentDocRef, {
                  loanId: newLoanDocRef.id,
                  partnerId: partner.id,
                  installmentNumber: i,
                  dueDate: dueDate.toISOString(),
                  status: 'pending',
                  capitalAmount: capitalPerInstallment,
                  interestAmount: interestPerInstallment,
                  totalAmount: totalPerInstallment,
                });
              }
            }
            importedCount++;
          } else {
            failedCount++;
          }
        }
        
        if (importedCount === 0 && failedCount > 0) {
            throw new Error(`No se pudo importar ningún préstamo. ${failedCount} fila(s) no tenían un socio coincidente.`);
        }

        await batch.commit();

        let description = `${importedCount} préstamo(s) y sus cuotas fueron importados correctamente.`;
        if (failedCount > 0) {
            description += ` ${failedCount} fila(s) fueron omitidas por no encontrar al socio.`;
        }

        toast({
          title: "Importación Completa",
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
      <AddLoanDialog
        isOpen={isLoanDialogOpen}
        setIsOpen={setIsLoanDialogOpen}
        loanToEdit={loanToEdit}
      />
      
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
            <Button size="sm" onClick={openNewDialog}>
              Añadir Préstamo
            </Button>
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
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Socio</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Fecha de Otorgamiento</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[50px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[50px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  )}
                  {!isLoading && sortedLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.partnerName || loan.partnerId}</TableCell>
                      <TableCell>{currencyFormatter.format(loan.totalAmount)}</TableCell>
                      <TableCell>{dateFormatter(loan.startDate)}</TableCell>
                      <TableCell className="hidden md:table-cell">{!isNaN(loan.numberOfInstallments) ? loan.numberOfInstallments : '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{!isNaN(loan.interestRate) ? `${loan.interestRate}%` : '-'}</TableCell>
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
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/loans/${loan.id}`)}>Ver Detalles</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(loan)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
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
                  {!isLoading && sortedLoans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No se encontraron préstamos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
