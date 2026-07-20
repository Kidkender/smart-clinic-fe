import { z } from 'zod';

export const labTestSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã xét nghiệm.'),
  name: z.string().min(1, 'Vui lòng nhập tên xét nghiệm.'),
  category: z.string().min(1, 'Vui lòng chọn nhóm.'),
  unit: z.string(),
  price: z.number({ message: 'Giá phải là số.' }).min(0, 'Giá không được âm.'),
  refRangeLow: z.string(),
  refRangeHigh: z.string(),
  refRangeText: z.string(),
  active: z.boolean(),
});

export type LabTestFormValues = z.infer<typeof labTestSchema>;
