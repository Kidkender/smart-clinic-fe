import { z } from 'zod';

export const medicalSupplySchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên vật tư.'),
  category: z.string(),
  unit: z.string().min(1, 'Vui lòng nhập đơn vị.'),
  manufacturer: z.string(),
  unit_cost: z.number({ message: 'Đơn giá phải là số.' }).min(0, 'Đơn giá không được âm.'),
  min_stock_level: z.number({ message: 'Định mức tối thiểu phải là số.' }).int('Định mức phải là số nguyên.').min(0, 'Định mức không được âm.'),
});

export type MedicalSupplyFormValues = z.infer<typeof medicalSupplySchema>;

export const supplyStockInSchema = z.object({
  lot_number: z.string().min(1, 'Vui lòng nhập số lô.'),
  expiry_date: z.string(),
  quantity: z.number({ message: 'Số lượng phải là số.' }).int('Số lượng phải là số nguyên.').positive('Số lượng phải lớn hơn 0.'),
  supplier: z.string().min(1, 'Vui lòng nhập nhà cung cấp.'),
  unit_cost: z.number({ message: 'Đơn giá phải là số.' }).min(0, 'Đơn giá không được âm.'),
  notes: z.string(),
});

export type SupplyStockInFormValues = z.infer<typeof supplyStockInSchema>;

export const supplyStockOutSchema = z.object({
  batch_id: z.string(),
  quantity: z.number({ message: 'Số lượng phải là số.' }).int('Số lượng phải là số nguyên.').positive('Số lượng phải lớn hơn 0.'),
  type: z.enum(['transfer_out', 'adjustment']),
  notes: z.string(),
});

export type SupplyStockOutFormValues = z.infer<typeof supplyStockOutSchema>;
