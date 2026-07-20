import { z } from 'zod';

export const doctorProfileSchema = z.object({
  specialty: z.string().min(1, 'Vui lòng nhập chuyên khoa.'),
  license_no: z.string(),
  qualification: z.string(),
  years_experience: z.number({ message: 'Số năm kinh nghiệm phải là số.' })
    .int('Số năm kinh nghiệm phải là số nguyên.')
    .min(0, 'Số năm kinh nghiệm không được âm.'),
  bio: z.string(),
});

export type DoctorProfileFormValues = z.infer<typeof doctorProfileSchema>;
