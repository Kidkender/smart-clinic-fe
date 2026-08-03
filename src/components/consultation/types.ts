export interface Encounter {
  ID: number | string;
  PatientID: number | string;
  DepartmentID: number | string;
  Patient?: { Fullname?: string; MRN?: string; Allergies?: string };
  Department?: { Name?: string };
  Type: string;
  Status: string;
  QueueNumber: number;
  ClinicalNotes?: string;
}

export interface VitalSign {
  ID: number | string;
  Temperature: number;
  Pulse: number;
  BloodPressureSystolic: number;
  BloodPressureDiastolic: number;
  SpO2: number;
  RespiratoryRate: number;
  RecordedAt?: string;
  CreatedAt?: string;
}

export interface Icd10Code {
  Code: string;
  Descriptor: string;
}

export interface Diagnosis {
  ID: number | string;
  ICD10Code: string;
  ICD10Descriptor?: string;
  IsPrimary?: boolean;
  Notes?: string;
}

export interface Order {
  ID: number | string;
  Type: string;
  Name: string;
  Price?: number;
  Status: string;
  ResultSummary?: string;
  CoveredByInsurance?: boolean;
}

export interface PrescriptionItemFlag {
  ID: number;
  Reason: string;
  Status: string;
  CreatedAt: string;
}

export interface PrescriptionItem {
  ID: number | string;
  DrugID: number | string;
  Drug?: { Name?: string };
  Quantity: number;
  Dosage?: string;
  Instructions?: string;
  Flags?: PrescriptionItemFlag[];
}

export interface Prescription {
  ID: number | string;
  Items?: PrescriptionItem[];
  Status: string;
  ReadyAt?: string | null;
}

export interface Drug {
  ID: number | string;
  Name: string;
  StockQuantity: number;
}

export interface DrugWarning {
  severity: string;
  description?: string;
  drug_a_id: number | string;
  drug_b_id: number | string;
}

export interface DuplicateDrugWarning {
  drug_id: number | string;
  drug_name: string;
  existing_prescription_id: number | string;
}
