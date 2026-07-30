import { z } from 'zod';

// Only 'insurance_company' is creatable from the UI — a Payer is reusable
// master data with recurring debt tracking (GetPayerDebtSummary), which
// only makes sense for an organization with a real reconciliation cycle.
// 'individual' still exists as a backend enum value for legacy records,
// but is intentionally not offered here: an ad-hoc "family member promises
// to pay later" case is a one-off note on the invoice, not a reusable payer.
export const payerSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên.'),
  type: z.literal('insurance_company'),
  contact_phone: z.string(),
  contact_email: z.string(),
});

export type PayerFormValues = z.infer<typeof payerSchema>;
