import { AnomalyDetector } from "./anomaly-detector";
import { sampleLoanJsonString } from "@/lib/data";

export default function ValidationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Detección de Anomalías</h1>
      </div>
      <p className="text-muted-foreground">
        Utiliza esta herramienta para detectar inconsistencias en los datos históricos de los préstamos. 
        Pega los datos del préstamo en formato JSON en el área de texto a continuación y haz clic en "Analizar".
      </p>

      <AnomalyDetector sampleData={sampleLoanJsonString} />

    </div>
  );
}
