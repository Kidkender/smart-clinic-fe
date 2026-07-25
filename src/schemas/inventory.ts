import { z } from 'zod';

export const stockInSchema = z.object({
  lot_number: z.string().min(1, 'Vui lòng nhập số lô.'),
  expiry_date: z.string().min(1, 'Vui lòng chọn hạn sử dụng.'),
  quantity: z.number({ message: 'Số lượng phải là số.' }).int('Số lượng phải là số nguyên.').positive('Số lượng phải lớn hơn 0.'),
  supplier: z.string(),
  unit_cost: z.number({ message: 'Đơn giá phải là số.' }).min(0, 'Đơn giá không được âm.'),
  notes: z.string(),
});

export type StockInFormValues = z.infer<typeof stockInSchema>;

export const stockOutSchema = z.object({
  batch_id: z.string(),
  quantity: z.number({ message: 'Số lượng phải là số.' }).int('Số lượng phải là số nguyên.').positive('Số lượng phải lớn hơn 0.'),
  type: z.enum(['transfer_out', 'adjustment']),
  notes: z.string(),
});

export type StockOutFormValues = z.infer<typeof stockOutSchema>;
