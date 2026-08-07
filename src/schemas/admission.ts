import { z } from 'zod';

export const admissionSchema = z.object({
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân.'),
  department_id: z.string().min(1, 'Vui lòng chọn khoa điều trị.'),
  attending_doctor_id: z.string().min(1, 'Vui lòng chọn bác sĩ điều trị.'),
  admission_type: z.string().min(1, 'Vui lòng chọn diện điều trị.'),
  ward_id: z.string().min(1, 'Vui lòng chọn khu điều trị.'),
  bed_id: z.string().min(1, 'Vui lòng chọn giường.'),
  coverage_percent: z.string().optional(),
}).refine(
  data => !data.coverage_percent || (Number(data.coverage_percent) >= 0 && Number(data.coverage_percent) <= 100),
  { message: 'Mức hưởng BHYT phải là số từ 0 đến 100.', path: ['coverage_percent'] },
);

export type AdmissionFormValues = z.infer<typeof admissionSchema>;
