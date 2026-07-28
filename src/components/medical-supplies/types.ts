export interface MedicalSupply {
  ID: number | string;
  Name: string;
  Category?: string;
  Unit: string;
  Manufacturer?: string;
  UnitCost: number;
  StockQuantity: number;
  MinStockLevel: number;
}

export interface MedicalSupplyBatch {
  ID: number | string;
  SupplyID: number | string;
  Supply?: MedicalSupply;
  LotNumber: string;
  ExpiryDate?: string | null;
  Supplier?: string;
  UnitCost: number;
  QuantityReceived: number;
  QuantityRemaining: number;
  ReceivedAt: string;
}

export type SupplyStockTransactionType = 'purchase' | 'transfer_out' | 'adjustment' | 'usage';

export interface SupplyStockTransaction {
  ID: number | string;
  SupplyID: number | string;
  Supply?: MedicalSupply;
  BatchID?: number | string | null;
  Batch?: MedicalSupplyBatch | null;
  Type: SupplyStockTransactionType;
  Quantity: number;
  Reference?: string;
  Notes?: string;
  CreatedAt: string;
}

export interface SupplyUsageItem {
  ID: number | string;
  SupplyID: number | string;
  Supply?: MedicalSupply;
  Quantity: number;
}

export interface SupplyUsage {
  ID: number | string;
  EncounterID: number | string;
  Context?: string;
  Items?: SupplyUsageItem[];
  CreatedAt: string;
}

export type SupplyStockAuditStatus = 'draft' | 'completed';

export interface SupplyStockAuditItem {
  ID: number | string;
  SupplyID: number | string;
  Supply?: MedicalSupply;
  ExpectedQuantity: number;
  CountedQuantity?: number | null;
  Variance?: number | null;
}

export interface SupplyStockAudit {
  ID: number | string;
  AuditDate: string;
  Status: SupplyStockAuditStatus;
  Notes?: string;
  CompletedAt?: string | null;
  Items?: SupplyStockAuditItem[];
}
