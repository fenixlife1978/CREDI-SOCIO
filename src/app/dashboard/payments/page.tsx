
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import IndividualPayment from './individual-payment';
import RegisterPaymentPage from './register/page';
import InstallmentPayment from "./installment-payment";


export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Pagos</h1>
      </div>
      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Pago por Lista</TabsTrigger>
            <TabsTrigger value="installment">Pago por Cuota</TabsTrigger>
            <TabsTrigger value="individual">Abono Individual</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
            <RegisterPaymentPage />
        </TabsContent>
        <TabsContent value="installment">
            <InstallmentPayment />
        </TabsContent>
        <TabsContent value="individual">
            <IndividualPayment />
        </TabsContent>
      </Tabs>
    </div>
  );
}
