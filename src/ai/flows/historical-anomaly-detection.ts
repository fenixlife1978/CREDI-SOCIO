'use server';

/**
 * @fileOverview An anomaly detection AI agent for historical loan data.
 *
 * - detectHistoricalAnomalies - A function that handles the anomaly detection process.
 * - HistoricalAnomalyDetectionInput - The input type for the detectHistoricalAnomalies function.
 * - HistoricalAnomalyDetectionOutput - The return type for the detectHistoricalAnomalies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HistoricalAnomalyDetectionInputSchema = z.object({
  loanData: z.string().describe('JSON string of loan data, including installments and payments. Ensure dates are in ISO format.'),
});
export type HistoricalAnomalyDetectionInput = z.infer<typeof HistoricalAnomalyDetectionInputSchema>;

const HistoricalAnomalyDetectionOutputSchema = z.object({
  anomalies: z.array(
    z.object({
      description: z.string().describe('Description of the anomaly.'),
      severity: z.enum(['high', 'medium', 'low']).describe('Severity of the anomaly.'),
      location: z.string().optional().describe('Location of the anomaly within the loan data (e.g., installment number).'),
    })
  ).describe('List of anomalies detected in the loan data.'),
});
export type HistoricalAnomalyDetectionOutput = z.infer<typeof HistoricalAnomalyDetectionOutputSchema>;

export async function detectHistoricalAnomalies(input: HistoricalAnomalyDetectionInput): Promise<HistoricalAnomalyDetectionOutput> {
  return detectHistoricalAnomaliesFlow(input);
}

const detectHistoricalAnomaliesPrompt = ai.definePrompt({
  name: 'detectHistoricalAnomaliesPrompt',
  input: {schema: HistoricalAnomalyDetectionInputSchema},
  output: {schema: HistoricalAnomalyDetectionOutputSchema},
  prompt: `You are an expert financial analyst specializing in detecting anomalies in loan data.

You will receive loan data in JSON format, including information about installments and payments.
Your task is to identify any inconsistencies or anomalies in the data, such as:

- Installments paid out of order.
- Incoherent amounts (e.g., payment exceeding installment amount).
- Late payments (if the payment date is significantly after the due date).
- Missing payments (if an installment is past due but not marked as paid).
- Any other unusual patterns or discrepancies that could indicate errors or fraud.

Analyze the loan data and return a list of anomalies, including a description of each anomaly, its severity (high, medium, or low), and its location within the loan data (e.g., installment number).

Here is the loan data:

{{loanData}}

Make sure dates are parsed correctly; they are in ISO format.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
       {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
       {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const detectHistoricalAnomaliesFlow = ai.defineFlow(
  {
    name: 'detectHistoricalAnomaliesFlow',
    inputSchema: HistoricalAnomalyDetectionInputSchema,
    outputSchema: HistoricalAnomalyDetectionOutputSchema,
  },
  async input => {
    try {
      // Parse the JSON string to ensure it's valid JSON
      JSON.parse(input.loanData);
    } catch (e: any) {
      throw new Error(`Invalid JSON format in loanData: ${e.message}`);
    }

    const {output} = await detectHistoricalAnomaliesPrompt(input);
    return output!;
  }
);
