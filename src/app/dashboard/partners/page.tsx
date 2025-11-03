'use client';

import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Upload, Trash2, Search, Pencil, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, writeBatch, deleteDoc, getDocs, where } from "firebase/firestore";
import type { Partner } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { AddPartnerDialog } from "./add-partner-dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function PartnersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [partnerToEdit, setPartnerToEdit] = useState<Partner | null>(null);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const partnersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'partners'));
  }, [firestore]);

  const { data: partners, isLoading } = useCollection<Partner>(partnersQuery);
  
  const filteredPartners = useMemo(() => {
    if (!partners) return [];
    if (!searchTerm) return partners;

    const lowercasedTerm = searchTerm.toLowerCase();
    return partners.filter(partner => 
      partner.firstName.toLowerCase().includes(lowercasedTerm) ||
      partner.lastName.toLowerCase().includes(lowercasedTerm) ||
      (partner.identificationNumber && partner.identificationNumber.toLowerCase().includes(lowercasedTerm)) ||
      (partner.alias && partner.alias.toLowerCase().includes(lowercasedTerm))
    );
  }, [partners, searchTerm]);


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

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
        const partnersCollectionRef = collection(firestore, 'partners');
        let importedCount = 0;

        json.forEach(row => {
          const firstName = row['Nombre'] || row['nombre'];
          const lastName = row['Apellido'] || row['apellido'];
          
          if (firstName && lastName) {
            const newPartnerDocRef = doc(partnersCollectionRef);
            const newPartnerDoc = {
              firstName: String(firstName),
              lastName: String(lastName),
              identificationNumber: String(row['Cédula'] || ''),
              alias: String(row['Alias'] || ''),
            };
            batch.set(newPartnerDocRef, newPartnerDoc);
            importedCount++;
          }
        });

        if (importedCount === 0) {
            throw new Error("No se encontraron filas con 'Nombre' y 'Apellido' en el archivo.");
        }

        await batch.commit();

        toast({
          title: "Éxito",
          description: `${importedCount} socio(s) importado(s) correctamente.`,
        });

      } catch (error: any) {
        console.error("Error importing partners:", error);
        toast({
          title: "Error al importar",
          description: error.message || "No se pudo procesar el archivo de Excel.",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        if(fileInputRef.current) {
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
    }
    reader.readAsBinaryString(file);
  };
  
  const openDeleteDialog = (partner: Partner) => {
    setPartnerToDelete(partner);
    setIsAlertOpen(true);
  };

  const openEditDialog = (partner: Partner) => {
    setPartnerToEdit(partner);
    setIsPartnerDialogOpen(true);
  };

  const openNewDialog = () => {
    setPartnerToEdit(null);
    setIsPartnerDialogOpen(true);
  };

  const handleViewProfile = (partnerId: string) => {
    // Navigate to the loans page and pass the partnerId as a query parameter
    // This allows the loans page to filter loans for that specific partner
    router.push(`/dashboard/loans?partnerId=${partnerId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!partnerToDelete || !firestore) return;
    
    try {
      const batch = writeBatch(firestore);
  
      // 1. Delete the partner document
      const partnerDocRef = doc(firestore, 'partners', partnerToDelete.id);
      batch.delete(partnerDocRef);
  
      // 2. Find and delete all loans associated with the partner
      const loansQuery = query(collection(firestore, 'loans'), where('partnerId', '==', partnerToDelete.id));
      const loansSnapshot = await getDocs(loansQuery);
  
      const loanIds = loansSnapshot.docs.map(doc => doc.id);
  
      for (const loanDoc of loansSnapshot.docs) {
        batch.delete(loanDoc.ref);
      }
  
      // 3. Find and delete all installments associated with those loans
      if (loanIds.length > 0) {
        // Firestore 'in' query is limited to 30 items. If there are more loans, we need to batch the installment deletion queries.
        for (let i = 0; i < loanIds.length; i += 30) {
          const chunkOfLoanIds = loanIds.slice(i, i + 30);
          const installmentsQuery = query(collection(firestore, 'installments'), where('loanId', 'in', chunkOfLoanIds));
          const installmentsSnapshot = await getDocs(installmentsQuery);
          installmentsSnapshot.forEach(installmentDoc => {
            batch.delete(installmentDoc.ref);
          });
        }
      }
  
      await batch.commit();
  
      toast({
        title: "Socio y Datos Eliminados",
        description: `El socio ${partnerToDelete.firstName} ${partnerToDelete.lastName} y todos sus préstamos y cuotas han sido eliminados.`,
      });
  
    } catch (error) {
      console.error("Error deleting partner and associated data: ", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el socio y sus datos asociados. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAlertOpen(false);
      setPartnerToDelete(null);
    }
  };

  return (
    <>
      <AddPartnerDialog 
        isOpen={isPartnerDialogOpen} 
        setIsOpen={setIsPartnerDialogOpen} 
        partnerToEdit={partnerToEdit}
      />

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg md:text-2xl">Socios</h1>
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
              <PlusCircle className="h-4 w-4 mr-2" />
              Añadir Socio
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestionar Socios</CardTitle>
            <CardDescription>
              Busca, añade, edita y visualiza la información de los socios.
            </CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula, alias..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead className="hidden md:table-cell">Alias</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{`${partner.firstName} ${partner.lastName}`}</TableCell>
                    <TableCell>{partner.identificationNumber}</TableCell>
                    <TableCell className="hidden md:table-cell">{partner.alias}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleViewProfile(partner.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(partner)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDeleteDialog(partner)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredPartners.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No se encontraron socios con los criterios de búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente al socio <span className="font-bold">{partnerToDelete?.firstName} {partnerToDelete?.lastName}</span> y todos sus préstamos y cuotas asociadas.
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
