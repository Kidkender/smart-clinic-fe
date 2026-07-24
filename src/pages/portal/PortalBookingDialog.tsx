import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getPortalDoctors, getPortalAvailableSlots, bookMyAppointment } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { appointmentTypeLabel, APPOINTMENT_TYPES } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { ErrorAlert } from '@/components/ui/alert';
import { portalBookingSchema, type PortalBookingFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { toLocalDateInput } from '@/components/appointments/types';
import FieldError from '@/components/FieldError';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PORTAL_LABEL, PORTAL_INPUT } from './constants';
import type { Department, Doctor, Slot } from './types';

export default function PortalBookingDialog({
  open,
  onOpenChange,
  departments,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onBooked: () => Promise<void>;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const {
    control: bookingControl, handleSubmit: handleBookingSubmit, reset: resetBooking,
    setValue: setBookingValue, watch: watchBooking, formState: { errors: bookingErrors },
  } = useForm<PortalBookingFormValues>({
    resolver: zodResolver(portalBookingSchema),
    defaultValues: { department_id: '', doctor_id: '', type: 'new', reason: '' },
  });
  const bookingDepartmentId = watchBooking('department_id');
  const bookingDoctorId = watchBooking('doctor_id');
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    resetBooking({ department_id: String(departments[0]?.ID ?? ''), doctor_id: '', type: 'new', reason: '' });
    setDoctors([]);
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    setFormError('');
    if (departments[0]?.ID) {
      getPortalDoctors(departments[0].ID).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDepartmentChange = async (departmentId: string) => {
    setBookingValue('department_id', departmentId, { shouldValidate: true });
    setBookingValue('doctor_id', '');
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    if (!departmentId) {
      setDoctors([]);
      return;
    }
    try {
      const result = await getPortalDoctors(departmentId);
      setDoctors(result.data ?? []);
    } catch {
      setDoctors([]);
    }
  };

  const handleDoctorChange = (doctorId: string) => {
    setBookingValue('doctor_id', doctorId, { shouldValidate: true });
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
  };

  const handleSlotDateChange = async (date: string) => {
    setSlotDate(date);
    setSlots([]);
    setSelectedSlot(null);
    if (!date || !bookingDoctorId) return;
    setLoadingSlots(true);
    try {
      const result = await getPortalAvailableSlots(bookingDoctorId, date);
      setSlots(result.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = handleBookingSubmit(async values => {
    setFormError('');

    if (!selectedSlot) {
      setFormError('Vui lòng chọn một khung giờ.');
      return;
    }

    setSaving(true);
    try {
      await bookMyAppointment({
        department_id: Number(values.department_id),
        doctor_id: Number(values.doctor_id),
        scheduled_at: selectedSlot.start_time,
        type: values.type,
        reason: values.reason,
      });
      await onBooked();
      onOpenChange(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const canSubmitBooking = !!bookingDepartmentId && !!bookingDoctorId && !!selectedSlot;

  return (
    <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] sm:max-w-[460px] overflow-y-auto rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#134e48]">Đặt lịch khám</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleBook} noValidate>
          <label className={PORTAL_LABEL}>Khoa *</label>
          <Controller
            control={bookingControl}
            name="department_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleDepartmentChange}>
                <SelectTrigger className={cn(PORTAL_INPUT, 'w-full')}>
                  <SelectValue placeholder="-- Chọn khoa --" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={bookingErrors.department_id?.message} />

          <label className={PORTAL_LABEL}>Bác sĩ *</label>
          <Controller
            control={bookingControl}
            name="doctor_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={handleDoctorChange}
                disabled={doctors.length === 0}
              >
                <SelectTrigger className={cn(PORTAL_INPUT, 'w-full')}>
                  <SelectValue placeholder="-- Chọn bác sĩ --" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doc => (
                    <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={bookingErrors.doctor_id?.message} />
          {doctors.length === 0 && (
            <p className="mt-2 text-[13px] text-[#dc3545]">
              Khoa này hiện chưa có bác sĩ nào — vui lòng chọn khoa khác.
            </p>
          )}

          {bookingDoctorId && (
            <>
              <label className={PORTAL_LABEL}>Chọn ngày khám</label>
              <DatePicker value={slotDate} onChange={handleSlotDateChange} className="border-[#d1fae5] text-[#134e48]" min={toLocalDateInput(new Date())} />
              {loadingSlots && <p className="mt-2 text-[13px] text-[#6c757d]">Đang tải khung giờ…</p>}
              {!loadingSlots && slotDate && slots.length === 0 && (
                <div className="mt-2 rounded-lg border border-[#dc3545]/20 bg-[#dc3545]/6 px-3 py-2.5">
                  <p className="m-0 text-[13px] font-semibold text-[#dc3545]">
                    Bác sĩ không có khung giờ trống ngày này, vui lòng chọn ngày khác.
                  </p>
                </div>
              )}
              {slots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map(slot => {
                    const isSelected = selectedSlot?.start_time === slot.start_time;
                    return (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'cursor-pointer rounded-full border border-[#d1fae5] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#134e48]',
                          isSelected && 'border-[#0d9488] bg-[#0d9488] text-white',
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

          <label className={PORTAL_LABEL}>Loại khám</label>
          <Controller
            control={bookingControl}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn(PORTAL_INPUT, 'w-full data-[size=default]:h-auto')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{appointmentTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />

          <label className={PORTAL_LABEL}>Lý do khám</label>
          <Controller
            control={bookingControl}
            name="reason"
            render={({ field }) => <Input {...field} className={PORTAL_INPUT} />}
          />

          {formError && <ErrorAlert className="mt-4">{formError}</ErrorAlert>}

          <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-auto rounded-xl border-[#d1fae5] px-5 py-2.5 text-sm font-medium text-[#134e48]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving || !canSubmitBooking}
              className="h-auto rounded-xl bg-[#0d9488] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
            >
              {saving ? 'Đang đặt…' : 'Xác nhận đặt lịch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
