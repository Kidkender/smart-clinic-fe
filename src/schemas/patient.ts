import { z } from 'zod';
import { validateFullname, validatePhone } from '@/utils/validation';

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export const patientSchema = z.object({
  fullname: z.string().superRefine((value, ctx) => {
    const message = validateFullname(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().superRefine((value, ctx) => {
    const message = validatePhone(value, { required: false });
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  cccd: z.string(),
  address: z.string(),
  insurance_number: z.string(),
  allergies: z.string(),
  date_of_birth: z.string().refine(value => !value || value <= todayDateInput(), {
    message: 'Ngày sinh không được ở tương lai.',
  }),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

export const contactSchema = z.object({
  fullname: z.string().superRefine((value, ctx) => {
    const message = validateFullname(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  relationship: z.string(),
  phone: z.string().superRefine((value, ctx) => {
    const message = validatePhone(value, { required: false });
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
