import { z } from 'zod';

export const payerSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên.'),
  type: z.enum(['individual', 'insurance_company']),
  contact_phone: z.string(),
  contact_email: z.string(),
});

export type PayerFormValues = z.infer<typeof payerSchema>;
