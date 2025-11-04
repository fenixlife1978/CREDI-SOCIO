'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = () => {
    const success = login(pin);
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'PIN Incorrecto',
        description: 'El PIN que introdujiste no es válido. Inténtalo de nuevo.',
      });
      setPin('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-full w-fit mb-4">
                <Bus className="h-10 w-10" />
            </div>
          <CardTitle>Asoc. Coop. Transp. La Candelaria R.L.</CardTitle>
          <CardDescription>
            Introduce el PIN para desbloquear el acceso al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="PIN de acceso"
            className="text-center text-lg tracking-widest"
            autoFocus
          />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin}>
            Desbloquear
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
