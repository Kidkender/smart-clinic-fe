import { z } from 'zod';

export const doctorShiftSchema = z.object({
  department_id: z.string().min(1, 'Vui lòng chọn khoa/phòng.'),
  shift_date: z.string().min(1, 'Vui lòng chọn ngày trực.'),
  shift_type: z.string().min(1),
});

export type DoctorShiftFormValues = z.infer<typeof doctorShiftSchema>;

export const doctorLeaveSchema = z.object({
  start_date: z.string().min(1, 'Vui lòng chọn ngày bắt đầu.'),
  end_date: z.string().min(1, 'Vui lòng chọn ngày kết thúc.'),
  reason: z.string(),
}).refine(values => !values.start_date || !values.end_date || values.end_date >= values.start_date, {
  message: 'Ngày kết thúc phải sau ngày bắt đầu.',
  path: ['end_date'],
});

export type DoctorLeaveFormValues = z.infer<typeof doctorLeaveSchema>;

export const doctorWorkingHoursSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().min(1, 'Vui lòng chọn giờ bắt đầu.'),
  end_time: z.string().min(1, 'Vui lòng chọn giờ kết thúc.'),
  slot_minutes: z.number({ message: 'Độ dài khung giờ phải là số.' }).int().min(5, 'Độ dài khung giờ tối thiểu 5 phút.'),
}).refine(values => !values.start_time || !values.end_time || values.end_time > values.start_time, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu.',
  path: ['end_time'],
});

export type DoctorWorkingHoursFormValues = z.infer<typeof doctorWorkingHoursSchema>;
