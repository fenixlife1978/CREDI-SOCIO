'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Ajustes</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Ajustes de la Cuenta</CardTitle>
          <CardDescription>
            Gestiona la configuración de tu cuenta. Próximamente podrás cambiar tu contraseña aquí.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Más ajustes estarán disponibles en el futuro.</p>
        </CardContent>
      </Card>
    </div>
  );
}
