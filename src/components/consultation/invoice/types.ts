export interface InvoiceItem {
  ID: number | string;
  Category: string;
  Description: string;
  UnitPrice: number;
  Quantity: number;
  Amount: number;
  CoveredByInsurance: boolean;
}

export interface Payment {
  ID: number | string;
  AllocationID: number;
  Amount: number;
  Method: string;
  PaidAt: string;
}

export interface Refund {
  ID: number | string;
  Amount: number;
  Reason: string;
  RefundedAt: string;
  InvoiceItemID: number | string | null;
  InvoiceItem: InvoiceItem | null;
}

export interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
}

export interface InsurancePolicy {
  ID: number | string;
  PayerID: number | string;
  PolicyNumber: string;
}

export interface CoverageEstimate {
  eligible_amount: number;
  coverage_percent: number;
  covered_amount: number;
  patient_amount: number;
}

export type AllocationStatus = 'pending' | 'approved' | 'settled' | 'rejected';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface InsuranceClaim {
  ID: number;
  AllocationID: number;
  PolicyNumber: string;
  ReferenceNumber: string;
  Status: ClaimStatus;
  SubmittedAmount: number;
  ApprovedAmount: number | null;
  Note: string;
  SubmittedAt: string;
  RespondedAt: string | null;
}

export interface InvoicePayerAllocation {
  ID: number;
  InvoiceID: number;
  PayerID: number | null;
  Payer: Payer | null;
  Sequence: number;
  AllocatedAmount: number;
  Status: AllocationStatus;
  Note: string;
  Claim?: InsuranceClaim | null;
}

export interface Invoice {
  ID: number | string;
  Status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  SubtotalAmount: number;
  TaxAmount: number;
  TotalAmount: number;
  Allocations: InvoicePayerAllocation[] | null;
  Items: InvoiceItem[] | null;
  Payments: Payment[] | null;
  Refunds: Refund[] | null;
  CoverageEstimate: CoverageEstimate | null;
  TotalPatientAmount: number | null;
  InNetwork: boolean | null;
}

export interface Encounter {
  ID: number | string;
  PatientID: number | string;
  Type: string;
  HasInsurance: boolean;
  CoveragePercent: number | null;
  RegisteredFacilityCode: string | null;
}

export const PAYMENT_METHODS = ['cash', 'transfer', 'qr', 'vnpay'] as const;
// Only cash and VNPay are wired up end-to-end right now; transfer/qr stay in
// the type union (backend + history rendering still need them) but are
// hidden from the picker until those flows are actually implemented.
export const SELECTABLE_PAYMENT_METHODS = ['cash', 'vnpay'] as const satisfies readonly (typeof PAYMENT_METHODS)[number][];
