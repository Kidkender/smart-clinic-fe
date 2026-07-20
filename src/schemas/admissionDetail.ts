import { z } from 'zod';

export const transferSchema = z.object({
  department_id: z.string(),
  ward_id: z.string(),
  bed_id: z.string(),
  reason: z.string(),
});

export type TransferFormValues = z.infer<typeof transferSchema>;

export const dischargeSchema = z.object({
  summary: z.string().min(1, 'Vui lòng nhập tóm tắt bệnh án xuất viện.'),
});

export type DischargeFormValues = z.infer<typeof dischargeSchema>;

export const admissionVitalSchema = z.object({
  temperature: z.number({ message: 'Nhiệt độ phải là số.' }).min(0),
  pulse: z.number({ message: 'Mạch phải là số.' }).min(0),
  blood_pressure_systolic: z.number({ message: 'HA tâm thu phải là số.' }).min(0),
  blood_pressure_diastolic: z.number({ message: 'HA tâm trương phải là số.' }).min(0),
  respiratory_rate: z.number({ message: 'Nhịp thở phải là số.' }).min(0),
  spo2: z.number({ message: 'SpO2 phải là số.' }).min(0),
});

export type AdmissionVitalFormValues = z.infer<typeof admissionVitalSchema>;

export const progressNoteSchema = z.object({
  content: z.string().min(1, 'Vui lòng nhập diễn biến bệnh.'),
  doctor_orders: z.string(),
});

export type ProgressNoteFormValues = z.infer<typeof progressNoteSchema>;

export const nursingLogSchema = z.object({
  progress_note_id: z.string(),
  action: z.string().min(1, 'Vui lòng nhập hành động.'),
  notes: z.string(),
});

export type NursingLogFormValues = z.infer<typeof nursingLogSchema>;
