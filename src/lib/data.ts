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
  id: string;
  partnerName: string;
  loanId: string;
  installmentNumber: number;
  amount: number;
  paymentDate: string;
};

export const mockPartners: Partner[] = [
  { id: '1', name: 'John Doe', idNumber: '123456789', alias: 'Johnny', activeLoans: 2 },
  { id: '2', name: 'Jane Smith', idNumber: '987654321', alias: 'Janie', activeLoans: 1 },
  { id: '3', name: 'Peter Jones', idNumber: '456789123', alias: 'Pete', activeLoans: 0 },
  { id: '4', name: 'Mary Johnson', idNumber: '789123456', alias: 'MJ', activeLoans: 3 },
];

export const mockLoans: Loan[] = [
  { id: 'L001', partnerName: 'John Doe', partnerId: '1', totalAmount: 5000, installments: 12, interestRate: 5, status: 'Active', startDate: '2023-01-15' },
  { id: 'L002', partnerName: 'John Doe', partnerId: '1', totalAmount: 10000, installments: 24, interestRate: 4.5, status: 'Active', startDate: '2023-06-20' },
  { id: 'L003', partnerName: 'Jane Smith', partnerId: '2', totalAmount: 2500, installments: 6, interestRate: 7, status: 'Paid Off', startDate: '2022-11-01' },
  { id: 'L004', partnerName: 'Mary Johnson', partnerId: '4', totalAmount: 15000, installments: 36, interestRate: 3.9, status: 'Overdue', startDate: '2023-02-10' },
  { id: 'L005', partnerName: 'Mary Johnson', partnerId: '4', totalAmount: 1200, installments: 12, interestRate: 8, status: 'Active', startDate: '2024-01-05' },
];

export const mockPayments: Payment[] = [
    { id: 'P001', partnerName: 'John Doe', loanId: 'L001', installmentNumber: 5, amount: 429.17, paymentDate: '2023-06-14' },
    { id: 'P002', partnerName: 'Jane Smith', loanId: 'L003', installmentNumber: 6, amount: 432.05, paymentDate: '2023-05-01' },
    { id: 'P003', partnerName: 'Mary Johnson', loanId: 'L004', installmentNumber: 3, amount: 442.22, paymentDate: '2023-05-15' },
    { id: 'P004', partnerName: 'John Doe', loanId: 'L002', installmentNumber: 1, amount: 436.56, paymentDate: '2023-07-20' },
];


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
