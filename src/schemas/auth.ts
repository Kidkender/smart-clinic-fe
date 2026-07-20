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
  token: z.string().min(1, 'Vui lòng nhập mã đặt lại.'),
  newPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
