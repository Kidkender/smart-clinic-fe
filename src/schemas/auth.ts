import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullname: z.string().min(1, 'Vui lòng nhập họ tên.'),
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ.'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  otp: z.string().length(6, 'Mã OTP gồm 6 chữ số.').regex(/^\d{6}$/, 'Mã OTP chỉ gồm chữ số.'),
  newPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp.',
  path: ['confirmPassword'],
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.'),
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
