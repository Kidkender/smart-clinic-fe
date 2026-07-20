import { z } from 'zod';

export const checkInSchema = z.object({
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân.'),
  type: z.string().min(1),
});

export type CheckInFormValues = z.infer<typeof checkInSchema>;
