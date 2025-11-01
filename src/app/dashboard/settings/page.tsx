'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';

const pinChangeSchema = z.object({
  currentPin: z.string().length(4, 'El PIN actual debe tener 4 dígitos.'),
  newPin: z.string().length(4, 'El nuevo PIN debe tener 4 dígitos.'),
  confirmPin: z.string().length(4, 'La confirmación del PIN debe tener 4 dígitos.'),
}).refine(data => data.newPin === data.confirmPin, {
  message: 'El nuevo PIN y la confirmación no coinciden.',
  path: ['confirmPin'],
});

type PinChangeFormData = z.infer<typeof pinChangeSchema>;

export default function SettingsPage() {
  const { changePin } = useAuth();
  const { toast } = useToast();

  const form = useForm<PinChangeFormData>({
    resolver: zodResolver(pinChangeSchema),
    defaultValues: {
      currentPin: '',
      newPin: '',
      confirmPin: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = (data: PinChangeFormData) => {
    const success = changePin(data.currentPin, data.newPin);
    if (success) {
      toast({
        title: '¡Éxito!',
        description: 'Tu código PIN ha sido cambiado correctamente.',
      });
      form.reset();
    } else {
      toast({
        title: 'Error',
        description: 'El PIN actual es incorrecto. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      form.resetField('currentPin');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Ajustes</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Cambiar Código PIN</CardTitle>
          <CardDescription>
            Actualiza el código PIN de 4 dígitos utilizado para acceder a la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN Actual</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        className="text-lg tracking-[0.5rem]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo PIN</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        className="text-lg tracking-[0.5rem]"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        className="text-lg tracking-[0.5rem]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
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
