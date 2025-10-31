'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import type { CompanyProfile } from '@/lib/data';

const settingsSchema = z.object({
  companyName: z.string().min(1, 'El nombre de la empresa es requerido.'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido.').or(z.literal('')).optional(),
  rif: z.string().optional(),
});


type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settingsDocRef = doc(firestore, 'settings', 'companyProfile');
  const { data: companyProfile, isLoading } = useDoc<CompanyProfile>(settingsDocRef);
  
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: '',
      address: '',
      phone: '',
      email: '',
      rif: '',
    },
  });

  useEffect(() => {
    if (companyProfile) {
      form.reset({
        companyName: companyProfile.companyName || '',
        address: companyProfile.address || '',
        phone: companyProfile.phone || '',
        email: companyProfile.email || '',
        rif: companyProfile.rif || '',
      });
    }
  }, [companyProfile, form]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      await setDoc(settingsDocRef, data, { merge: true });
      toast({
        title: '¡Guardado!',
        description: 'La información de la empresa ha sido actualizada.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Configuración</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil de la Empresa</CardTitle>
          <CardDescription>
            Actualiza la información de tu empresa. Estos datos se usarán en reportes y otras partes de la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Mi Empresa S.A." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="rif"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RIF (o ID Fiscal)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: J-12345678-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <div className="grid md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Contacto</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contacto@miempresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="+58 414-1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección Fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="Av. Principal, Edificio Central, Piso 1, Oficina 1A, Ciudad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
