import { z } from 'zod';

export const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân.'),
  department_id: z.string().min(1, 'Vui lòng chọn khoa.'),
  doctor_id: z.string().min(1, 'Vui lòng chọn bác sĩ.'),
  scheduled_at: z.string(),
  type: z.string(),
  reason: z.string(),
}).superRefine((values, ctx) => {
  if (!values.scheduled_at) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduled_at'],
      message: 'Bác sĩ không có khung giờ trống ngày này. Vui lòng chọn ngày khác.',
    });
    return;
  }
  if (Number.isNaN(new Date(values.scheduled_at).getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduled_at'], message: 'Thời gian hẹn không hợp lệ.' });
  }
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
