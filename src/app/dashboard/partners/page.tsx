'use client';

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Upload, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, writeBatch, deleteDoc } from "firebase/firestore";
import type { Partner } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

export default function PartnersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  const partnersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'partners'));
  }, [firestore]);

  const { data: partners, isLoading } = useCollection<Partner>(partnersQuery);

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

  const handleDeleteConfirm = async () => {
    if (!partnerToDelete || !firestore) return;
    try {
      const partnerDocRef = doc(firestore, 'partners', partnerToDelete.id);
      await deleteDoc(partnerDocRef);
      toast({
        title: "Socio Eliminado",
        description: `El socio ${partnerToDelete.firstName} ${partnerToDelete.lastName} ha sido eliminado.`,
      });
    } catch (error) {
      console.error("Error deleting partner: ", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el socio. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAlertOpen(false);
      setPartnerToDelete(null);
    }
  };

  return (
    <>
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
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Añadir Socio
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestionar Socios</CardTitle>
            <CardDescription>
              Añade, edita y visualiza la información de los socios.
            </CardDescription>
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
                {!isLoading && partners?.map((partner) => (
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
                          <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
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
                {!isLoading && partners?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No se encontraron socios.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente al socio <span className="font-bold">{partnerToDelete?.firstName} {partnerToDelete?.lastName}</span> de la base de datos.
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
