// This file now defines the data structures (types) for the application.
// The actual data will be fetched from Firestore.

export type Partner = {
  id: string; // Document ID from Firestore
  firstName: string;
  lastName: string;
  identificationNumber: string;
  alias?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
};

export type Loan = {
  id: string; // Document ID from Firestore
  partnerId: string; // Reference to the partner
  loanType: 'standard' | 'custom';
  totalAmount: number;
  numberOfInstallments: number;
  interestRate: number;
  startDate: string; // Should be an ISO string
  status: 'Active' | 'Paid Off' | 'Overdue';
  
  // Optional: For displaying partner info directly on the loan
  partnerName?: string; 
};

export type Payment = {
  id: string; // Document ID from Firestore
  partnerId: string;
  loanId: string;
  installmentIds: string[];
  paymentDate: string; // ISO string
  totalAmount: number;
  
  // Optional: For display purposes
  partnerName?: string;
};

export type Installment = {
  id: string; // Document ID from Firestore
  loanId: string;
  partnerId: string;
  installmentNumber: number;
  dueDate: string; // ISO string
  paymentDate?: string; // ISO string
  status: 'pending' | 'paid' | 'overdue';
  capitalAmount: number;
  interestAmount: number;
  totalAmount: number;
}


// Sample data for the anomaly detector feature.
// This is NOT used in the main application logic anymore.
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
