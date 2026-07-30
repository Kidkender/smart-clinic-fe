import { z } from 'zod';

export const checkInSchema = z.object({
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân.'),
  type: z.string().min(1),
  has_insurance: z.boolean(),
  coverage_percent: z.string(),
  registered_facility_code: z.string(),
});

export type CheckInFormValues = z.infer<typeof checkInSchema>;
