import { z } from 'zod';

export const submitSurveySchema = z.object({
  rating: z.number().min(1, 'Vui lòng chọn số sao đánh giá.').max(5),
  comment: z.string(),
});

export type SubmitSurveyFormValues = z.infer<typeof submitSurveySchema>;
