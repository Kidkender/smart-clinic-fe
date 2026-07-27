import { z } from 'zod';

export const staffCreateSchema = z.object({
  fullname: z.string().min(1, 'Vui lòng nhập họ tên.'),
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  role: z.string().min(1, 'Vui lòng chọn vai trò.'),
  department_id: z.string(),
});

export type StaffCreateFormValues = z.infer<typeof staffCreateSchema>;
