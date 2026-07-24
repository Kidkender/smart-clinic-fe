export interface Department {
  ID: number | string;
  Name: string;
}

export interface Doctor {
  id: number | string;
  fullname: string;
}

export interface DoctorFilterOption {
  ID: number | string;
  Fullname: string;
}

export interface Appointment {
  ID: number | string;
  PatientID: number | string;
  DepartmentID: number | string;
  Patient?: { Fullname?: string };
  Department?: { Name?: string };
  Doctor?: { Fullname?: string };
  ScheduledAt: string;
  Status: 'booked' | 'checked_in' | 'cancelled' | 'no_show';
}

export interface Slot {
  start_time: string;
}

export interface PatientOption {
  ID: number | string;
  Fullname: string;
  MRN: string;
}

export function toLocalDateTimeInput(isoString: string) {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
