export type Partner = {
  id: string;
  name: string;
  idNumber: string;
  alias: string;
  activeLoans: number;
};

export type Loan = {
  id: string;
  partnerName: string;
  partnerId: string;
  totalAmount: number;
  installments: number;
  interestRate: number;
  status: 'Active' | 'Paid Off' | 'Overdue';
  startDate: string;
};

export type Payment = {
  id:string;
  partnerName: string;
  loanId: string;
  installmentNumber: number;
  amount: number;
  paymentDate: string;
};

export const sampleLoanForAnomalyDetection = {
  loanId: "L-ANOM-01",
  totalAmount: 1000,
  installmentsCount: 5,
  installments: [
    { number: 1, dueDate: "2024-01-15", amount: 200, status: "paid", paymentDate: "2024-01-14" },
    { number: 2, dueDate: "2024-02-15", amount: 200, status: "paid", paymentDate: "2024-03-20" }, // Paid late
    { number: 3, dueDate: "2024-03-15", amount: 200, status: "paid", paymentDate: "2024-02-18" }, // Paid before installment 2
    { number: 4, dueDate: "2024-04-15", amount: 250, status: "paid", paymentDate: "2024-04-15" }, // Incoherent amount (higher than others)
    { number: 5, dueDate: "2024-05-15", amount: 200, status: "pending", paymentDate: null }
  ]
};

export const sampleLoanJsonString = JSON.stringify(sampleLoanForAnomalyDetection, null, 2);
