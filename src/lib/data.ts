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
  status: 'Active' | 'Finalizado' | 'Overdue';
  
  // Optional: For displaying partner info directly on the loan
  partnerName?: string; 
  fixedInterestAmount?: number | null;
};

export type Payment = {
  id: string; // Document ID from Firestore
  partnerId: string;
  loanId: string;
  installmentIds: string[];
  paymentDate: string; // ISO string
  totalAmount: number;
  capitalAmount: number;
  interestAmount: number;
  
  // Optional: For display purposes
  partnerName?: string;
};

export type Installment = {
  id:string; // Document ID from Firestore
  loanId: string;
  partnerId: string;
  installmentNumber: number;
  dueDate: string; // ISO string
  paymentDate?: string; // ISO string
  status: 'pending' | 'paid' | 'overdue';
  capitalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paymentId?: string; // Reference to the payment document
  receiptId?: string;
}

export type Receipt = {
    id: string;
    type: 'loan_grant' | 'installment_payment';
    partnerId: string;
    loanId: string;
    paymentId?: string;
    installmentId?: string;
    generationDate: string; // ISO
    amount: number;
    // For display
    partnerName?: string;
    partnerIdentification?: string;
    // For loan grant
    loanDetails?: {
      totalAmount: number;
      interestRate: number;
      numberOfInstallments: number;
      loanType: string;
    };
    // For installment payment
    installmentDetails?: {
      installmentNumber: number;
      capitalAmount: number;
      interestAmount: number;
    };
};
