'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Palette, Building, Save, Loader } from 'lucide-react';
import { useStorage, useFirestore } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Helper to convert HSL string to object
const hslStringToObject = (hsl: string) => {
  if (!hsl) return { h: 0, s: 0, l: 0 };
  const [h, s, l] = hsl.match(/\d+(\.\d+)?/g) || ['0', '0', '0'];
  return { h: parseFloat(h), s: parseFloat(s), l: parseFloat(l) };
};

// Helper to convert HSL object to string
const hslObjectToString = (hsl: { h: number, s: number, l: number }) => {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
};

interface ColorSettings {
  background: { h: number, s: number, l: number };
  foreground: { h: number, s: number, l: number };
  primary: { h: number, s: number, l: number };
  card: { h: number, s: number, l: number };
  accent: { h: number, s: number, l_number: number };
}


export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = useStorage();
  const firestore = useFirestore();

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [colors, setColors] = useState({
    background: { h: 40, s: 33, l: 96 },
    foreground: { h: 222, s: 84, l: 5 },
    primary: { h: 221, s: 44, l: 41 },
    card: { h: 0, s: 0, l: 100 },
    accent: { h: 45, s: 93, l: 69 },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const settingsDocRef = useMemo(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!settingsDocRef) return;
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyName(data.companyName || 'COOP. LA CANDELARIA');
          setLogoUrl(data.logoUrl || '');
          if (data.themeColors) {
            setColors(data.themeColors);
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({ title: "Error", description: "No se pudieron cargar los ajustes.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [settingsDocRef, toast]);
  
  // Apply colors to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--background', hslObjectToString(colors.background));
    document.documentElement.style.setProperty('--foreground', hslObjectToString(colors.foreground));
    document.documentElement.style.setProperty('--primary', hslObjectToString(colors.primary));
    document.documentElement.style.setProperty('--card', hslObjectToString(colors.card));
    document.documentElement.style.setProperty('--accent', hslObjectToString(colors.accent));
  }, [colors]);


  const handleColorChange = (name: keyof typeof colors, value: string) => {
    const [h, s, l] = value.split(',').map(v => parseFloat(v.trim()));
     setColors(prev => ({
        ...prev,
        [name]: {h,s,l}
    }));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    if (!storage || !firestore || !settingsDocRef) {
        toast({ title: "Error", description: "Servicios no inicializados.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
        let finalLogoUrl = logoUrl;
        if (logoFile) {
            const logoStorageRef = storageRef(storage, `logos/company_logo_${Date.now()}`);
            const uploadResult = await uploadBytes(logoStorageRef, logoFile);
            finalLogoUrl = await getDownloadURL(uploadResult.ref);
            setLogoUrl(finalLogoUrl);
        }

        await setDoc(settingsDocRef, {
            companyName,
            logoUrl: finalLogoUrl,
            themeColors: colors,
        }, { merge: true });

        toast({
            title: "¡Guardado!",
            description: "Los ajustes de la aplicación han sido actualizados.",
        });

    } catch (error) {
        console.error("Error saving settings:", error);
        toast({ title: "Error", description: "No se pudieron guardar los ajustes.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <div>Cargando ajustes...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Configuración Avanzada</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building /> Identidad de la Empresa</CardTitle>
            <CardDescription>
              Personaliza el nombre y el logo de la empresa que aparecen en la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Mi Cooperativa"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo de la Empresa</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-md border flex items-center justify-center bg-muted">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-contain rounded-md" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin logo</span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/svg+xml"
                />
                <Button variant="outline" onClick={handleLogoClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  {logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sube un archivo de imagen (PNG, JPG, SVG). Recomendado: 128x128px.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Color Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette /> Apariencia Visual</CardTitle>
            <CardDescription>
              Ajusta los colores principales de la interfaz. Ingresa los valores en formato HSL (ej: 221, 44, 41).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Fondo</Label>
                    <Input value={`${colors.background.h}, ${colors.background.s}, ${colors.background.l}`} onChange={(e) => handleColorChange('background', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Texto Principal</Label>
                    <Input value={`${colors.foreground.h}, ${colors.foreground.s}, ${colors.foreground.l}`} onChange={(e) => handleColorChange('foreground', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Color Primario</Label>
                    <Input value={`${colors.primary.h}, ${colors.primary.s}, ${colors.primary.l}`} onChange={(e) => handleColorChange('primary', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Fondo de Tarjetas</Label>
                    <Input value={`${colors.card.h}, ${colors.card.s}, ${colors.card.l}`} onChange={(e) => handleColorChange('card', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Color de Acento</Label>
                    <Input value={`${colors.accent.h}, ${colors.accent.s}, ${colors.accent.l}`} onChange={(e) => handleColorChange('accent', e.target.value)} />
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
       <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Guardando...' : 'Guardar Todos los Cambios'}
            </Button>
       </div>
    </div>
  );
}
