import { z } from 'zod';

export const imagingProcedureSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã dịch vụ.'),
  name: z.string().min(1, 'Vui lòng nhập tên dịch vụ.'),
  modality: z.string().min(1, 'Vui lòng chọn loại kỹ thuật.'),
  bodyPart: z.string(),
  price: z.number({ message: 'Giá phải là số.' }).min(0, 'Giá không được âm.'),
  active: z.boolean(),
});

export type ImagingProcedureFormValues = z.infer<typeof imagingProcedureSchema>;
