'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import Image from 'next/image';

export default function LockPage() {
  const [pin, setPin] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = () => {
    if (login(pin)) {
      toast({
        title: '¡Éxito!',
        description: 'Código PIN correcto. Bienvenido.',
      });
      router.push('/dashboard');
    } else {
      toast({
        title: 'Error',
        description: 'Código PIN incorrecto. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setPin('');
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,4}$/.test(value)) {
      setPin(value);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Image 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-q3G8iA3f_3y2aV-Y-aZgxoLzHqR-5Q&s"
                    alt="Logo"
                    width={80}
                    height={80}
                    className="rounded-full"
                />
            </div>
          <CardTitle>Acceso Restringido</CardTitle>
          <CardDescription>
            Introduce el código PIN de 4 dígitos para desbloquear.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            type="password"
            value={pin}
            onChange={handlePinChange}
            onKeyDown={handleKeyDown}
            maxLength={4}
            placeholder="••••"
            className="text-center text-2xl tracking-[1rem] font-mono"
            autoFocus
          />
          <Button onClick={handleLogin}>Desbloquear</Button>
        </CardContent>
      </Card>
    </div>
  );
}
