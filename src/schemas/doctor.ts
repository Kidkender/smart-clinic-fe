import { z } from 'zod';

export const doctorProfileSchema = z.object({
  specialty: z.string().min(1, 'Vui lòng nhập chuyên khoa.'),
  license_no: z.string(),
  qualification: z.string(),
  institution: z.string(),
  years_experience: z.number({ message: 'Số năm kinh nghiệm phải là số.' })
    .int('Số năm kinh nghiệm phải là số nguyên.')
    .min(0, 'Số năm kinh nghiệm không được âm.'),
  bio: z.string(),
});

export type DoctorProfileFormValues = z.infer<typeof doctorProfileSchema>;

export const doctorCreateSchema = z.object({
  fullname: z.string().min(1, 'Vui lòng nhập họ tên.'),
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  department_id: z.string().min(1, 'Vui lòng chọn khoa.'),
  specialty: z.string().min(1, 'Vui lòng nhập chuyên khoa.'),
  license_no: z.string(),
  qualification: z.string(),
  institution: z.string(),
  years_experience: z.number({ message: 'Số năm kinh nghiệm phải là số.' })
    .int('Số năm kinh nghiệm phải là số nguyên.')
    .min(0, 'Số năm kinh nghiệm không được âm.'),
  bio: z.string(),
});

export type DoctorCreateFormValues = z.infer<typeof doctorCreateSchema>;
