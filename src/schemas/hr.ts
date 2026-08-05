import { z } from 'zod';

export const employeeProfileSchema = z.object({
  position: z.string().min(1, 'Vui lòng nhập chức danh.'),
  license_no: z.string(),
  qualification: z.string(),
  institution: z.string(),
  years_experience: z.number({ message: 'Số năm kinh nghiệm phải là số.' })
    .int('Số năm kinh nghiệm phải là số nguyên.')
    .min(0, 'Số năm kinh nghiệm không được âm.'),
});

export type EmployeeProfileFormValues = z.infer<typeof employeeProfileSchema>;

export const staffWeeklyShiftSchema = z.object({
  department_id: z.string(),
  days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    start_time: z.string(),
    end_time: z.string(),
  })).length(7),
}).superRefine((values, ctx) => {
  values.days.forEach((day, index) => {
    if (!day.enabled) return;
    if (!day.start_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng chọn giờ bắt đầu.', path: ['days', index, 'start_time'] });
    }
    if (!day.end_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng chọn giờ kết thúc.', path: ['days', index, 'end_time'] });
    }
    if (day.start_time && day.end_time && day.end_time <= day.start_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải sau giờ bắt đầu.', path: ['days', index, 'end_time'] });
    }
  });
});

export type StaffWeeklyShiftFormValues = z.infer<typeof staffWeeklyShiftSchema>;
