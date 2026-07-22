import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordVitalSign } from '@/api/consultation';
import { resolveError } from '@/utils/errorMessages';
import { vitalSignSchema, type VitalSignFormValues } from '@/schemas/consultation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import { SectionHeader, ErrorBox, emptyVitalForm } from './shared';
import type { VitalSign } from './types';

export default function VitalsSection({
  encounterId,
  vitals,
  canRecord,
  onRecorded,
}: {
  encounterId: string;
  vitals: VitalSign[];
  canRecord: boolean;
  onRecorded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<VitalSignFormValues>({
    resolver: zodResolver(vitalSignSchema),
    defaultValues: emptyVitalForm(),
  });

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await recordVitalSign(encounterId, {
        temperature: values.temperature,
        pulse: values.pulse,
        blood_pressure_systolic: values.systolic,
        blood_pressure_diastolic: values.diastolic,
        respiratory_rate: values.respiratoryRate,
        spo2: values.spo2,
      });
      reset(emptyVitalForm());
      setOpen(false);
      await onRecorded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader title="Sinh hiệu" canAct={canRecord} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Ghi sinh hiệu" />
      {vitals.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có bản ghi sinh hiệu.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {vitals.map(v => (
            <li key={v.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div>
                <div className="font-semibold text-[#274760]">
                  {v.Temperature}°C · {v.Pulse} nhịp/p · {v.BloodPressureSystolic}/{v.BloodPressureDiastolic} mmHg · SpO2 {v.SpO2}% · Nhịp thở {v.RespiratoryRate}
                </div>
                <div className="text-xs text-[#6c757d]">{new Date(v.RecordedAt || v.CreatedAt || '').toLocaleString('vi-VN')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canRecord && (
        <form onSubmit={handleFormSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Nhiệt độ (°C)</label>
              <Input type="number" step="0.1" {...register('temperature', { valueAsNumber: true })} aria-invalid={!!errors.temperature} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
              <FieldError message={errors.temperature?.message} />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Mạch (nhịp/p)</label>
              <Input type="number" {...register('pulse', { valueAsNumber: true })} aria-invalid={!!errors.pulse} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
              <FieldError message={errors.pulse?.message} />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">HA tâm thu</label>
              <Input type="number" {...register('systolic', { valueAsNumber: true })} aria-invalid={!!errors.systolic} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
              <FieldError message={errors.systolic?.message} />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">HA tâm trương</label>
              <Input type="number" {...register('diastolic', { valueAsNumber: true })} aria-invalid={!!errors.diastolic} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
              <FieldError message={errors.diastolic?.message} />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Nhịp thở</label>
              <Input type="number" {...register('respiratoryRate', { valueAsNumber: true })} aria-invalid={!!errors.respiratoryRate} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
              <FieldError message={errors.respiratoryRate?.message} />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">SpO2 (%)</label>
              <Input type="number" {...register('spo2', { valueAsNumber: true })} aria-invalid={!!errors.spo2} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
              <FieldError message={errors.spo2?.message} />
            </div>
          </div>
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
            {saving ? 'Đang lưu…' : 'Lưu sinh hiệu'}
          </Button>
        </form>
      )}
    </Card>
  );
}
