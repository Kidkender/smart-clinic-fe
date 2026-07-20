import { z } from 'zod';
import { validateFullname, validatePhone } from '@/utils/validation';

export const portalLoginSchema = z.object({
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export type PortalLoginFormValues = z.infer<typeof portalLoginSchema>;

export const portalRegisterSchema = z.object({
  fullname: z.string().superRefine((value, ctx) => {
    const message = validateFullname(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().superRefine((value, ctx) => {
    const message = validatePhone(value, { required: true });
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  cccd: z.string(),
});

export type PortalRegisterFormValues = z.infer<typeof portalRegisterSchema>;

export const portalBookingSchema = z.object({
  department_id: z.string().min(1, 'Vui lòng chọn khoa.'),
  doctor_id: z.string(),
  reason: z.string(),
});

export type PortalBookingFormValues = z.infer<typeof portalBookingSchema>;

export const portalProfileSchema = z.object({
  phone: z.string().superRefine((value, ctx) => {
    const message = validatePhone(value, { required: false });
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
  address: z.string(),
  insurance_number: z.string(),
  allergies: z.string(),
});

export type PortalProfileFormValues = z.infer<typeof portalProfileSchema>;
