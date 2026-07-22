import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDiagnosis } from '@/api/consultation';
import { searchIcd10 } from '@/api/icd10';
import { resolveError } from '@/utils/errorMessages';
import { diagnosisSchema, type DiagnosisFormValues } from '@/schemas/consultation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import { SectionHeader, SectionBadge, ErrorBox } from './shared';
import type { Diagnosis, Icd10Code } from './types';

export default function DiagnosesSection({
  encounterId,
  diagnoses,
  canAdd,
  onAdded,
}: {
  encounterId: string;
  diagnoses: Diagnosis[];
  canAdd: boolean;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [icdQuery, setIcdQuery] = useState('');
  const [icdResults, setIcdResults] = useState<Icd10Code[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<Icd10Code | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    control, handleSubmit, reset, setValue, formState: { errors },
  } = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: { icd10_code: '', is_primary: false, notes: '' },
  });

  const handleIcdSearch = async (value: string) => {
    setIcdQuery(value);
    setSelectedIcd(null);
    setValue('icd10_code', '');
    if (value.trim().length < 1) {
      setIcdResults([]);
      return;
    }
    try {
      const result = await searchIcd10(value.trim());
      setIcdResults(result.data ?? []);
    } catch {
      setIcdResults([]);
    }
  };

  const handleSelectIcd = (icd: Icd10Code) => {
    setSelectedIcd(icd);
    setIcdQuery(`${icd.Code} — ${icd.Descriptor}`);
    setIcdResults([]);
    setValue('icd10_code', icd.Code, { shouldValidate: true });
  };

  const resetForm = () => {
    reset({ icd10_code: '', is_primary: false, notes: '' });
    setIcdQuery('');
    setIcdResults([]);
    setSelectedIcd(null);
  };

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await addDiagnosis(encounterId, values);
      resetForm();
      setOpen(false);
      await onAdded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader title="Chẩn đoán" canAct={canAdd} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Thêm chẩn đoán" />
      {diagnoses.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có chẩn đoán nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {diagnoses.map(d => (
            <li key={d.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div>
                <div className="font-semibold text-[#274760]">
                  {d.ICD10Code} {d.ICD10Descriptor ? `— ${d.ICD10Descriptor}` : ''} {d.IsPrimary && <SectionBadge>Chính</SectionBadge>}
                </div>
                {d.Notes && <div className="text-[13px] text-[#6c757d]">{d.Notes}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canAdd && (
        <form onSubmit={handleFormSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <div className="relative">
            <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Chẩn đoán (tra cứu ICD-10) *</label>
            <Input
              value={icdQuery}
              onChange={e => handleIcdSearch(e.target.value)}
              placeholder="Nhập mã hoặc tên bệnh, ví dụ: J00, viêm họng…"
              aria-invalid={!!errors.icd10_code}
              className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
            />
            {icdResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-[180px] w-full overflow-y-auto rounded-lg border border-[#dde2e8] bg-white shadow-md">
                {icdResults.map(icd => (
                  <div
                    key={icd.Code}
                    onClick={() => handleSelectIcd(icd)}
                    className="cursor-pointer px-3.5 py-2 text-sm text-[#274760] hover:bg-[#f4f7fa]"
                  >
                    <span className="font-semibold">{icd.Code}</span> — {icd.Descriptor}
                  </div>
                ))}
              </div>
            )}
            {!selectedIcd && icdQuery.trim().length > 0 && icdResults.length === 0 && (
              <p className="mt-1 text-[12px] text-[#dc3545]">Không tìm thấy mã ICD-10 phù hợp. Vui lòng chọn từ danh sách gợi ý.</p>
            )}
            <FieldError message={errors.icd10_code?.message} />
          </div>
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Ghi chú</label>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input {...field} placeholder="VD: Theo dõi thêm, tái khám sau 1 tuần…" className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            )}
          />
          <label className="mt-2.5 flex items-center gap-2 text-sm text-[#274760]">
            <Controller
              control={control}
              name="is_primary"
              render={({ field }) => (
                <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
              )}
            />
            Chẩn đoán chính
          </label>
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
            {saving ? 'Đang lưu…' : 'Lưu chẩn đoán'}
          </Button>
        </form>
      )}
    </Card>
  );
}
