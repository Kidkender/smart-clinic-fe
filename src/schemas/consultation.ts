import { z } from 'zod';

export const vitalSignSchema = z.object({
  temperature: z.number({ message: 'Nhiệt độ phải là số.' }).min(0),
  pulse: z.number({ message: 'Mạch phải là số.' }).min(0),
  systolic: z.number({ message: 'HA tâm thu phải là số.' }).min(0),
  diastolic: z.number({ message: 'HA tâm trương phải là số.' }).min(0),
  respiratoryRate: z.number({ message: 'Nhịp thở phải là số.' }).min(0),
  spo2: z.number({ message: 'SpO2 phải là số.' }).min(0),
});

export type VitalSignFormValues = z.infer<typeof vitalSignSchema>;

export const diagnosisSchema = z.object({
  icd10_code: z.string().min(1, 'Vui lòng chọn mã ICD-10 từ danh sách gợi ý.'),
  is_primary: z.boolean(),
  notes: z.string(),
});

export type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;

export const orderSchema = z.object({
  type: z.string().min(1, 'Vui lòng chọn loại chỉ định.'),
  name: z.string().min(1, 'Vui lòng nhập tên dịch vụ.'),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
