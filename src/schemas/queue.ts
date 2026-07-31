import { z } from 'zod';

export const checkInSchema = z.object({
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân.'),
  type: z.string().min(1),
  has_insurance: z.boolean(),
  coverage_percent: z.string(),
  registered_facility_code: z.string(),
  sync_to_patient_profile: z.boolean(),
  has_private_insurance: z.boolean(),
  private_payer_id: z.string(),
  private_policy_number: z.string(),
  private_card_number: z.string(),
  private_valid_from: z.string(),
  private_valid_to: z.string(),
  private_coverage_percent_estimate: z.string(),
});

export type CheckInFormValues = z.infer<typeof checkInSchema>;
