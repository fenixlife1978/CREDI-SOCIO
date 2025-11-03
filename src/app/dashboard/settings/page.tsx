'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RegisterAdmin from './register-admin';

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
            Gestiona la configuración de tu cuenta y de otros administradores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterAdmin />
        </CardContent>
      </Card>
    </div>
  );
}
