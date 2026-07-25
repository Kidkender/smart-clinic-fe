import { z } from 'zod';

export const drugSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên thuốc.'),
  active_ingredient: z.string(),
  strength: z.string(),
  unit: z.string().min(1, 'Vui lòng nhập đơn vị.'),
  manufacturer: z.string(),
  price: z.number({ message: 'Giá phải là số.' }).min(0, 'Giá không được âm.'),
  min_stock_level: z.number({ message: 'Định mức tối thiểu phải là số.' }).int('Định mức phải là số nguyên.').min(0, 'Định mức không được âm.'),
});

export type DrugFormValues = z.infer<typeof drugSchema>;
