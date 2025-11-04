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
          <CardTitle>Ajustes de la Aplicación</CardTitle>
          <CardDescription>
            Desde aquí podrás gestionar futuras configuraciones del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Actualmente no hay ajustes disponibles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
