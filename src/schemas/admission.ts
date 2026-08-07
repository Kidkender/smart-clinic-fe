import { z } from 'zod';

export const admissionSchema = z.object({
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân.'),
  department_id: z.string().min(1, 'Vui lòng chọn khoa điều trị.'),
  attending_doctor_id: z.string().min(1, 'Vui lòng chọn bác sĩ điều trị.'),
  admission_type: z.string().min(1, 'Vui lòng chọn diện điều trị.'),
  ward_id: z.string().min(1, 'Vui lòng chọn khu điều trị.'),
  bed_id: z.string().min(1, 'Vui lòng chọn giường.'),
});

export type AdmissionFormValues = z.infer<typeof admissionSchema>;
