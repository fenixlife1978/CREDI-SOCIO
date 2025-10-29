'use server';

import { detectHistoricalAnomalies } from '@/ai/flows/historical-anomaly-detection';
import { z } from 'zod';

const formSchema = z.object({
  loanData: z.string().min(1, 'Loan data cannot be empty.'),
});

export type FormState = {
  message: string;
  anomalies?: {
    description: string;
    severity: "high" | "medium" | "low";
    location?: string | undefined;
  }[];
  isError: boolean;
};

export async function runAnomalyDetection(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = formSchema.safeParse({
    loanData: formData.get('loanData'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data.',
      isError: true,
    };
  }
  
  const { loanData } = validatedFields.data;

  try {
    // Validate if the input is a valid JSON
    JSON.parse(loanData);
  } catch (e) {
    return {
      message: 'El texto introducido no es un JSON válido. Por favor, comprueba el formato.',
      isError: true,
    };
  }

  try {
    const result = await detectHistoricalAnomalies({ loanData });
    if (result.anomalies.length === 0) {
        return {
            message: 'Análisis completado. No se encontraron anomalías.',
            isError: false,
            anomalies: [],
        };
    }
    return {
      message: `${result.anomalies.length} anomalía(s) detectada(s).`,
      isError: false,
      anomalies: result.anomalies,
    };
  } catch (error: any) {
    console.error('Error detecting anomalies:', error);
    return {
      message: error.message || 'An unexpected error occurred while analyzing the data.',
      isError: true,
    };
  }
}
