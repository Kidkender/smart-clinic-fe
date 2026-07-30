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

export interface CoverageEstimate {
  eligible_amount: number;
  coverage_percent: number;
  covered_amount: number;
  patient_amount: number;
}

export interface Invoice {
  ID: number | string;
  Status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  SubtotalAmount: number;
  TaxAmount: number;
  TotalAmount: number;
  PayerID: number | string | null;
  Payer: Payer | null;
  Items: InvoiceItem[] | null;
  Payments: Payment[] | null;
  Refunds: Refund[] | null;
  CoverageEstimate: CoverageEstimate | null;
  TotalPatientAmount: number | null;
  InNetwork: boolean | null;
}

export interface Encounter {
  ID: number | string;
  HasInsurance: boolean;
  CoveragePercent: number | null;
  RegisteredFacilityCode: string | null;
}

export const PAYMENT_METHODS = ['cash', 'transfer', 'qr', 'vnpay'] as const;
// Only cash and VNPay are wired up end-to-end right now; transfer/qr stay in
// the type union (backend + history rendering still need them) but are
// hidden from the picker until those flows are actually implemented.
export const SELECTABLE_PAYMENT_METHODS = ['cash', 'vnpay'] as const satisfies readonly (typeof PAYMENT_METHODS)[number][];
