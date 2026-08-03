import { z } from 'zod';
import { validateFacilityName } from '@/utils/validation';

export const departmentSchema = z.object({
  name: z.string().superRefine((value, ctx) => {
    const message = validateFacilityName(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  description: z.string(),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const wardSchema = z.object({
  name: z.string().superRefine((value, ctx) => {
    const message = validateFacilityName(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  daily_rate: z.number({ message: 'Đơn giá phải là số.' }).min(0, 'Đơn giá không được âm.'),
});

export type WardFormValues = z.infer<typeof wardSchema>;

export const bedSchema = z.object({
  bed_number: z.string().min(1, 'Vui lòng nhập số giường.'),
});

export type BedFormValues = z.infer<typeof bedSchema>;

export const roomSchema = z.object({
  department_id: z.string().min(1, 'Vui lòng chọn khoa/phòng.'),
  name: z.string().superRefine((value, ctx) => {
    const message = validateFacilityName(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  code: z.string().min(1, 'Vui lòng nhập mã phòng.'),
  type: z.enum(['consultation', 'treatment'], { message: 'Vui lòng chọn loại phòng.' }),
  status: z.enum(['active', 'inactive']),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
