export interface Profile {
  Fullname: string;
  MRN: string;
  Phone?: string;
  Address?: string;
  InsuranceNumber?: string;
  Allergies?: string;
}

export interface Department {
  ID: number | string;
  Name: string;
}

export interface Doctor {
  id: number | string;
  fullname: string;
}

export interface Slot {
  start_time: string;
}

export interface Appointment {
  ID: number | string;
  DepartmentID: number | string;
  Department?: { Name?: string };
  Doctor?: { Fullname?: string };
  ScheduledAt: string;
  Reason?: string;
  Status: string;
}

export interface PrescriptionItem {
  ID: number | string;
  Drug?: { Name?: string };
  DrugID: number | string;
  Dosage: string;
  Quantity: number;
  Instructions?: string;
}

export interface Prescription {
  ID: number | string;
  EncounterID: number | string;
  Status: string;
  Items?: PrescriptionItem[];
}

export interface HistoryEncounter {
  ID: number | string;
  DepartmentID: number | string;
  Department?: { Name?: string };
  Type: string;
  Status: string;
  CheckedInAt: string;
  ClinicalNotes?: string;
}

export interface PatientHistory {
  encounters?: HistoryEncounter[];
  prescriptions?: Prescription[];
}

export interface InvoiceItem {
  ID: number | string;
  Description: string;
  Amount: number;
}

export interface Invoice {
  ID: number | string;
  TotalAmount: number;
  CreatedAt: string;
  Status: string;
  Items?: InvoiceItem[];
}

export interface Attachment {
  ID: number | string;
  FileName: string;
  Category: string;
  ContentType?: string;
  FileSize?: number;
  CreatedAt: string;
}
