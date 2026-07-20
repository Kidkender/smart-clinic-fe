import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { searchAppointments, createAppointment, cancelAppointment, markNoShow, checkInAppointment } from '@/api/appointment';
import { searchPatients } from '@/api/patient';
import { getDepartments, getDoctorsByDepartment } from '@/api/department';
import { listDoctors } from '@/api/doctor';
import { getAvailableSlots } from '@/api/doctorSchedule';
import { resolveError } from '@/utils/errorMessages';
import { appointmentStatusLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { appointmentSchema, type AppointmentFormValues } from '@/schemas/appointment';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Department {
  ID: number | string;
  Name: string;
}

interface Doctor {
  id: number | string;
  fullname: string;
}

interface DoctorFilterOption {
  ID: number | string;
  Fullname: string;
}

interface Appointment {
  ID: number | string;
  PatientID: number | string;
  DepartmentID: number | string;
  Patient?: { Fullname?: string };
  Department?: { Name?: string };
  Doctor?: { Fullname?: string };
  ScheduledAt: string;
  Status: 'booked' | 'checked_in' | 'cancelled' | 'no_show';
}

interface Slot {
  start_time: string;
}

interface PatientOption {
  ID: number | string;
  Fullname: string;
  MRN: string;
}

const STATUS_STYLES: Record<string, string> = {
  booked: 'bg-[#307bc4]/10 text-[#307bc4]',
  checked_in: 'bg-[#198754]/10 text-[#198754]',
  cancelled: 'bg-[#dc3545]/10 text-[#dc3545]',
  no_show: 'bg-[#6c757d]/10 text-[#6c757d]',
};

const PAGE_LIMIT = 20;

const EMPTY_APPOINTMENT_FORM: AppointmentFormValues = {
  patient_id: '', department_id: '', doctor_id: '', scheduled_at: '', reason: '',
};

const CHECKIN_TYPES = [
  { value: 'new', label: 'Khám mới' },
  { value: 'follow_up', label: 'Tái khám' },
  { value: 'insurance', label: 'BHYT' },
  { value: 'service', label: 'Dịch vụ' },
];

function toLocalDateTimeInput(isoString: string) {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Appointments() {
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'receptionist';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
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
  const [confirm, ConfirmDialog] = useConfirm();
  const [checkInTarget, setCheckInTarget] = useState<Appointment | null>(null);
  const [checkInType, setCheckInType] = useState('follow_up');
  const [checkingIn, setCheckingIn] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [doctorOptions, setDoctorOptions] = useState<DoctorFilterOption[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, departmentFilter, doctorFilter, dateFrom, dateTo, sortOrder]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchAppointments({
        page,
        limit: PAGE_LIMIT,
        q: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        department_id: departmentFilter === 'all' ? undefined : departmentFilter,
        doctor_id: doctorFilter === 'all' ? undefined : doctorFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        sort: sortOrder,
      });
      setAppointments(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, departmentFilter, doctorFilter, dateFrom, dateTo, sortOrder]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const hasActiveFilters = !!searchInput || statusFilter !== 'all' || departmentFilter !== 'all'
    || doctorFilter !== 'all' || !!dateFrom || !!dateTo || sortOrder !== 'asc';

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setDoctorFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortOrder('asc');
  };

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
    listDoctors({ page: 1, limit: 200 }).then(r => setDoctorOptions(r.data ?? [])).catch(() => {});
  }, []);

  const openCreate = () => {
    const departmentId = String(departments[0]?.ID ?? '');
    reset({ ...EMPTY_APPOINTMENT_FORM, department_id: departmentId });
    setFormError('');
    setSlotDate('');
    setSlots([]);
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setModalOpen(true);
    if (departmentId) {
      getDoctorsByDepartment(departmentId).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    } else {
      setDoctors([]);
    }
  };

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
        reason: values.reason,
      });
      await fetchAppointments();
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleCancel = async (appt: Appointment) => {
    if (!(await confirm('Hủy lịch hẹn này?', { confirmLabel: 'Hủy lịch' }))) return;
    try {
      await cancelAppointment(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleNoShow = async (appt: Appointment) => {
    if (!(await confirm('Đánh dấu bệnh nhân không đến khám?', { confirmLabel: 'Không đến' }))) return;
    try {
      await markNoShow(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const openCheckIn = (appt: Appointment) => {
    setCheckInTarget(appt);
    setCheckInType('follow_up');
  };

  const handleCheckIn = async () => {
    if (!checkInTarget) return;
    setCheckingIn(true);
    try {
      await checkInAppointment(checkInTarget.ID, checkInType);
      await fetchAppointments();
      setCheckInTarget(null);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Lịch hẹn</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Đặt lịch và quản lý tiếp nhận bệnh nhân</p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Đặt lịch hẹn
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, SĐT, CCCD, MRN…"
            className="h-auto rounded-full border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-auto w-[170px] rounded-full px-4 py-2.75 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="booked">{appointmentStatusLabel('booked')}</SelectItem>
            <SelectItem value="checked_in">{appointmentStatusLabel('checked_in')}</SelectItem>
            <SelectItem value="cancelled">{appointmentStatusLabel('cancelled')}</SelectItem>
            <SelectItem value="no_show">{appointmentStatusLabel('no_show')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-auto w-[180px] rounded-full px-4 py-2.75 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khoa</SelectItem>
            {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className="h-auto w-[180px] rounded-full px-4 py-2.75 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bác sĩ</SelectItem>
            {doctorOptions.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Fullname}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-full border border-[#dde2e8] py-1.5 pr-3.5 pl-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-[125px] border-0 bg-transparent p-0 text-sm text-[#274760] outline-none"
            />
          </div>
          <div className="mx-3 h-4.5 w-px bg-[#dde2e8]" />
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-[125px] border-0 bg-transparent p-0 text-sm text-[#274760] outline-none"
            />
          </div>
        </div>
        <Select value={sortOrder} onValueChange={value => setSortOrder(value as 'asc' | 'desc')}>
          <SelectTrigger className="h-auto w-[180px] rounded-full px-4 py-2.75 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ngày hẹn: sớm nhất trước</SelectItem>
            <SelectItem value="desc">Ngày hẹn: muộn nhất trước</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="h-auto rounded-full border-[#dde2e8] px-4 py-2.75 text-sm font-medium text-[#6c757d] hover:text-[#dc3545]"
          >
            <Icon icon="fa6-solid:filter-circle-xmark" className="text-sm" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : appointments.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            {search || statusFilter !== 'all' || departmentFilter !== 'all' || doctorFilter !== 'all' || dateFrom || dateTo ? 'Không tìm thấy lịch hẹn phù hợp.' : 'Chưa có lịch hẹn nào.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoa</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bác sĩ</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thời gian</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map(a => (
                <TableRow key={a.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Patient?.Fullname ?? `#${a.PatientID}`}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Department?.Name ?? `#${a.DepartmentID}`}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Doctor?.Fullname ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{new Date(a.ScheduledAt).toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[a.Status] ?? STATUS_STYLES.booked)}>
                      {appointmentStatusLabel(a.Status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {a.Status === 'booked' && canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openCheckIn(a)}
                          title="Check-in"
                          className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#198754]"
                        >
                          <Icon icon="fa6-solid:right-to-bracket" className="text-[13px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNoShow(a)}
                          title="Không đến"
                          className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                        >
                          <Icon icon="fa6-solid:user-clock" className="text-[13px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(a)}
                          title="Hủy"
                          className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                        >
                          <Icon icon="fa6-solid:xmark" className="text-[13px]" />
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-[#6c757d]">
            Trang {page}/{totalPages} · {total} lịch hẹn
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-sm font-medium text-[#274760]"
            >
              <Icon icon="fa6-solid:chevron-left" className="text-xs" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-sm font-medium text-[#274760]"
            >
              Sau
              <Icon icon="fa6-solid:chevron-right" className="text-xs" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={canManage && modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-h-[90vh] sm:max-w-[440px] overflow-y-auto rounded-[20px] p-8">
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

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bác sĩ (tùy chọn)</label>
            <Controller
              control={control}
              name="doctor_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleDoctorChange} disabled={doctors.length === 0}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Không chỉ định bác sĩ --" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
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
                  readOnly={!!doctorId}
                  aria-invalid={!!errors.scheduled_at}
                  className={cn(
                    'h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]',
                    doctorId && 'cursor-not-allowed bg-[#f4f7fa] text-[#6c757d]',
                  )}
                />
              )}
            />
            <FieldError message={errors.scheduled_at?.message} />
            {doctorId && (
              <p className="mt-1.5 text-[13px] text-[#6c757d]">
                {scheduledAt
                  ? 'Đã chỉ định bác sĩ — chọn khung giờ khác ở trên nếu muốn đổi.'
                  : 'Vui lòng chọn một khung giờ trống ở trên để điền giờ hẹn.'}
              </p>
            )}

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Lý do khám</label>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={field.onChange}
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
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !patientId || !departmentIdValue || !scheduledAt}
                className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {saving ? 'Đang lưu…' : 'Đặt lịch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkInTarget} onOpenChange={open => { if (!checkingIn && !open) setCheckInTarget(null); }}>
        <DialogContent className="sm:max-w-[400px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Check-in bệnh nhân</DialogTitle>
          </DialogHeader>
          <div>
            <p className="m-0 text-sm text-[#6c757d]">
              {checkInTarget?.Patient?.Fullname ?? `#${checkInTarget?.PatientID}`}
            </p>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại khám *</label>
            <Select value={checkInType} onValueChange={setCheckInType}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKIN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckInTarget(null)}
              disabled={checkingIn}
              className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {checkingIn ? 'Đang check-in…' : 'Check-in'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
