'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { Loader, Upload, Trash2 } from 'lucide-react';
import Image from 'next/image';

const pinSchema = z.object({
  newPin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres.'),
  confirmPin: z.string(),
}).refine(data => data.newPin === data.confirmPin, {
  message: "Los PIN no coinciden.",
  path: ["confirmPin"],
});

type PinFormData = z.infer<typeof pinSchema>;

export default function SettingsPage() {
  const { changePin, logoUrl, setLogoUrl, removeLogo } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PinFormData>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      newPin: '',
      confirmPin: '',
    },
  });

  const onPinSubmit = (data: PinFormData) => {
    setIsSubmitting(true);
    changePin(data.newPin);
    toast({
      title: '¡PIN Actualizado!',
      description: 'El PIN de acceso ha sido cambiado correctamente.',
    });
    form.reset();
    setIsSubmitting(false);
  };

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
            title: 'Archivo demasiado grande',
            description: 'Por favor, selecciona una imagen de menos de 2MB.',
            variant: 'destructive',
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setLogoUrl(result);
        toast({
          title: '¡Logo actualizado!',
          description: 'El nuevo logo ha sido guardado.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    removeLogo();
    toast({
      title: 'Logo eliminado',
      description: 'Se ha restaurado el logo predeterminado.',
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Ajustes</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
            <CardTitle>Cambiar PIN de Acceso</CardTitle>
            <CardDescription>
                Actualiza el PIN utilizado para desbloquear la aplicación.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onPinSubmit)} className="space-y-4">
                        <FormField
                        control={form.control}
                        name="newPin"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nuevo PIN</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="****" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="confirmPin"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirmar Nuevo PIN</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="****" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Nuevo PIN
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Logo de la Empresa</CardTitle>
            <CardDescription>Sube y gestiona el logo de la cooperativa.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full border border-dashed flex items-center justify-center bg-muted overflow-hidden">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo de la empresa" width={96} height={96} className="object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground text-center">Sin logo</span>
              )}
            </div>
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
            />
            <div className="flex gap-2">
                 <Button onClick={handleLogoUploadClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Logo
                </Button>
                {logoUrl && (
                    <Button variant="destructive" onClick={handleRemoveLogo}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Logo
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
