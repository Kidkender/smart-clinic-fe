export interface Drug {
  ID: number | string;
  Name: string;
  ActiveIngredient?: string;
  Strength?: string;
  Unit: string;
  Manufacturer?: string;
  Price: number;
  StockQuantity: number;
  MinStockLevel: number;
  CoveredByInsurance: boolean;
}

export interface DrugBatch {
  ID: number | string;
  DrugID: number | string;
  Drug?: Drug;
  LotNumber: string;
  ExpiryDate: string;
  Supplier?: string;
  UnitCost: number;
  QuantityReceived: number;
  QuantityRemaining: number;
  ReceivedAt: string;
}

export type StockTransactionType = 'purchase' | 'transfer_in' | 'transfer_out' | 'adjustment';

export interface StockTransaction {
  ID: number | string;
  DrugID: number | string;
  Drug?: Drug;
  BatchID?: number | string | null;
  Batch?: DrugBatch | null;
  Type: StockTransactionType;
  Quantity: number;
  Reference?: string;
  Notes?: string;
  CreatedAt: string;
}

export type StockAuditStatus = 'draft' | 'completed';

export interface StockAuditItem {
  ID: number | string;
  DrugID: number | string;
  Drug?: Drug;
  ExpectedQuantity: number;
  CountedQuantity?: number | null;
  Variance?: number | null;
}

export interface StockAudit {
  ID: number | string;
  AuditDate: string;
  Status: StockAuditStatus;
  Notes?: string;
  CompletedAt?: string | null;
  Items?: StockAuditItem[];
}
