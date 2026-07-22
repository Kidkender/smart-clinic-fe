import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAppointment } from '@/api/appointment';
import { searchPatients } from '@/api/patient';
import { getDoctorsByDepartment } from '@/api/department';
import { getAvailableSlots } from '@/api/doctorSchedule';
import { resolveError } from '@/utils/errorMessages';
import { appointmentTypeLabel, APPOINTMENT_TYPES } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { appointmentSchema, type AppointmentFormValues } from '@/schemas/appointment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toLocalDateTimeInput, type Department, type Doctor, type PatientOption, type Slot } from './types';

const EMPTY_APPOINTMENT_FORM: AppointmentFormValues = {
  patient_id: '', department_id: '', doctor_id: '', scheduled_at: '', type: 'new', reason: '',
};

export default function CreateAppointmentDialog({
  open,
  onOpenChange,
  departments,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onCreated: () => Promise<void>;
}) {
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const {
    control, handleSubmit, reset, setValue, watch, formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: EMPTY_APPOINTMENT_FORM,
  });
  const patientId = watch('patient_id');
  const departmentIdValue = watch('department_id');
  const doctorId = watch('doctor_id');
  const scheduledAt = watch('scheduled_at');
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  const resetFormState = () => {
    const departmentId = String(departments[0]?.ID ?? '');
    reset({ ...EMPTY_APPOINTMENT_FORM, department_id: departmentId });
    setFormError('');
    setSlotDate('');
    setSlots([]);
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    if (departmentId) {
      getDoctorsByDepartment(departmentId).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    } else {
      setDoctors([]);
    }
  };

  useEffect(() => {
    // Parent flips `open` via its own state (button click), which does not
    // route through Dialog's onOpenChange (Radix only fires that for
    // internally-triggered transitions like ESC/overlay). Re-seed the form
    // here instead, keyed only on `open` so it doesn't re-run on every
    // department/doctor selection while the dialog is already open.
    if (open) resetFormState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDepartmentChange = async (departmentId: string) => {
    setValue('department_id', departmentId, { shouldValidate: true });
    setValue('doctor_id', '');
    setValue('scheduled_at', '');
    setSlotDate('');
    setSlots([]);
    if (!departmentId) {
      setDoctors([]);
      return;
    }
    try {
      const result = await getDoctorsByDepartment(departmentId);
      setDoctors(result.data ?? []);
    } catch {
      setDoctors([]);
    }
  };

  const handleDoctorChange = (doctorId: string) => {
    setValue('doctor_id', doctorId);
    setValue('scheduled_at', '');
    setSlotDate('');
    setSlots([]);
  };

  const handleSlotDateChange = async (date: string) => {
    setSlotDate(date);
    setSlots([]);
    if (!date || !doctorId) return;
    setLoadingSlots(true);
    try {
      const result = await getAvailableSlots(doctorId, date);
      setSlots(result.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePickSlot = (slot: Slot) => {
    setValue('scheduled_at', toLocalDateTimeInput(slot.start_time), { shouldValidate: true });
  };

  const handlePatientSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientQuery(value);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const result = await searchPatients({ q: value.trim(), page: 1, limit: 10 });
      setPatientResults(result.data ?? []);
    } catch {
      setPatientResults([]);
    }
  };

  const handleSelectPatient = (patient: PatientOption) => {
    setSelectedPatient(patient);
    setValue('patient_id', String(patient.ID), { shouldValidate: true });
    setPatientQuery('');
    setPatientResults([]);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setValue('patient_id', '', { shouldValidate: true });
    setPatientQuery('');
    setPatientResults([]);
  };

  const handleCreate = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await createAppointment({
        patient_id: Number(values.patient_id),
        department_id: Number(values.department_id),
        doctor_id: values.doctor_id ? Number(values.doctor_id) : undefined,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        type: values.type,
        reason: values.reason,
      });
      await onCreated();
      onOpenChange(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (saving) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] sm:max-w-[720px] overflow-y-auto rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">Đặt lịch hẹn</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} noValidate>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bệnh nhân *</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-[#dde2e8] px-4 py-3">
              <span className="text-[15px] text-[#274760]">
                {selectedPatient.Fullname} <span className="text-xs text-[#6c757d]">({selectedPatient.MRN})</span>
              </span>
              <button
                type="button"
                onClick={handleClearPatient}
                className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
              >
                <Icon icon="fa6-solid:xmark" className="text-xs" />
              </button>
            </div>
          ) : (
            <>
              <Input
                value={patientQuery}
                onChange={handlePatientSearch}
                placeholder="Nhập tên, SĐT, CCCD, MRN…"
                aria-invalid={!!errors.patient_id}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              {patientResults.length > 0 && (
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-[#dde2e8]">
                  {patientResults.map(p => (
                    <div
                      key={p.ID}
                      onClick={() => handleSelectPatient(p)}
                      className="cursor-pointer px-3.5 py-2.5 text-sm text-[#274760] hover:bg-[#f4f7fa]"
                    >
                      {p.Fullname} <span className="text-xs text-[#6c757d]">· {p.MRN}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <FieldError message={errors.patient_id?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa *</label>
          <Controller
            control={control}
            name="department_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue placeholder="-- Chọn khoa --" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.department_id?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bác sĩ *</label>
          <Controller
            control={control}
            name="doctor_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleDoctorChange} disabled={doctors.length === 0}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue placeholder="-- Chọn bác sĩ --" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.doctor_id?.message} />
          {departmentIdValue && doctors.length === 0 && (
            <p className="mt-1.5 text-[13px] text-[#6c757d]">Khoa này chưa có bác sĩ nào.</p>
          )}

          {doctorId && (
            <>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Chọn ngày để xem khung giờ trống</label>
              <Input
                type="date"
                value={slotDate}
                onChange={e => handleSlotDateChange(e.target.value)}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              {loadingSlots && <p className="mt-2 text-[13px] text-[#6c757d]">Đang tải khung giờ…</p>}
              {!loadingSlots && slotDate && slots.length === 0 && (
                <p className="mt-2 text-[13px] text-[#6c757d]">Bác sĩ không có khung giờ trống ngày này, vui lòng đặt lịch hẹn vào thời gian khác.</p>
              )}
              {slots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map(slot => {
                    const isSelected = scheduledAt === toLocalDateTimeInput(slot.start_time);
                    return (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => handlePickSlot(slot)}
                        className={cn(
                          'rounded-full border border-[#dde2e8] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#274760]',
                          isSelected && 'border-[#307bc4] bg-[#307bc4] text-white',
                        )}
                      >
                        {new Date(slot.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Thời gian hẹn *</label>
          <Controller
            control={control}
            name="scheduled_at"
            render={({ field }) => (
              <Input
                type="datetime-local"
                value={field.value}
                onChange={field.onChange}
                readOnly
                aria-invalid={!!errors.scheduled_at}
                className="h-auto cursor-not-allowed rounded-xl border-[#dde2e8] bg-[#f4f7fa] px-4 py-3 text-[15px] text-[#6c757d]"
              />
            )}
          />
          <FieldError message={errors.scheduled_at?.message} />
          <p className="mt-1.5 text-[13px] text-[#6c757d]">
            {scheduledAt
              ? 'Chọn khung giờ khác ở trên nếu muốn đổi.'
              : 'Vui lòng chọn một khung giờ trống ở trên để điền giờ hẹn.'}
          </p>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại khám</label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{appointmentTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Lý do khám</label>
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder="VD: Đau bụng, tái khám định kỳ…"
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            )}
          />

          {formError && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
              {formError}
            </div>
          )}

          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving || !patientId || !departmentIdValue || !scheduledAt}
              className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {saving ? 'Đang lưu…' : 'Đặt lịch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
