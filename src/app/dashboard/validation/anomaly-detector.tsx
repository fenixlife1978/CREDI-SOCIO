"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { runAnomalyDetection, type FormState } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const initialState: FormState = {
  message: "",
  isError: false,
  anomalies: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Analizando...
        </>
      ) : (
        "Analizar Datos"
      )}
    </Button>
  );
}

function ResultsDisplay({ state }: { state: FormState }) {
  const { pending } = useFormStatus();

  if (pending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!state.message) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Esperando análisis</AlertTitle>
        <AlertDescription>
          Los resultados de la detección de anomalías aparecerán aquí.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (state.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error en el Análisis</AlertTitle>
        <AlertDescription>
          {state.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (state.anomalies && state.anomalies.length === 0) {
    return (
      <Alert className="border-green-500 text-green-700 dark:border-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 !text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-500">¡Todo en orden!</AlertTitle>
        <AlertDescription>
          {state.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      {state.anomalies?.map((anomaly, index) => (
        <Card key={index} className="bg-muted/50">
          <CardHeader className="flex flex-row items-start gap-4 p-4">
            <div className="mt-1">
              <Siren className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">
                  {anomaly.location ? `Anomalía en: ${anomaly.location}` : 'Anomalía Detectada'}
                </p>
                <Badge variant={anomaly.severity === 'high' ? 'destructive' : anomaly.severity === 'medium' ? 'secondary' : 'outline'}>
                  {anomaly.severity}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {anomaly.description}
              </p>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function AnomalyDetector({ sampleData }: { sampleData: string }) {
  const [state, formAction] = useFormState(runAnomalyDetection, initialState);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      loanData: sampleData,
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.isError) {
        toast({
          title: "Error",
          description: state.message,
          variant: "destructive",
        });
      } else if (state.anomalies?.length === 0) {
        toast({
          title: "¡Todo en orden!",
          description: state.message,
          className: "border-green-500 text-green-700 dark:border-green-600 dark:text-green-400",
        });
      } else {
        toast({
          title: "Análisis Completado",
          description: state.message,
          variant: "default",
        });
      }
    }
  }, [state, toast]);


  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Datos del Préstamo (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="loanData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Loan Data</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Pega aquí los datos del préstamo en formato JSON"
                          className="min-h-[400px] resize-y font-mono text-sm"
                          {...field}
                          name="loanData"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SubmitButton />
              </div>
            </Form>
          </CardContent>
        </Card>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resultados del Análisis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResultsDisplay state={state} />
        </CardContent>
      </Card>
    </div>
  );
}
