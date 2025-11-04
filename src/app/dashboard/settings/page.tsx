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
import { useState } from 'react';
import { Loader } from 'lucide-react';

const pinSchema = z.object({
  newPin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres.'),
  confirmPin: z.string(),
}).refine(data => data.newPin === data.confirmPin, {
  message: "Los PIN no coinciden.",
  path: ["confirmPin"],
});

type PinFormData = z.infer<typeof pinSchema>;

export default function SettingsPage() {
  const { changePin } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      </div>
    </div>
  );
}
