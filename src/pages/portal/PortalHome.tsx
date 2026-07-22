import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getMyProfile, getPortalDepartments, getPortalDoctors, getPortalAvailableSlots,
  listMyAppointments, bookMyAppointment, cancelMyAppointment,
  getMyHistory, getMyInvoices, updateMyProfile,
  listMyAttachments, downloadMyAttachment,
} from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import {
  appointmentStatusLabel, appointmentTypeLabel, APPOINTMENT_TYPES, encounterStatusLabel, encounterTypeLabel, invoiceStatusLabel,
  attachmentCategoryLabel,
} from '@/utils/labels';
import { usePatientAuth } from '@/context/PatientAuthContext';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { portalBookingSchema, portalProfileSchema, type PortalBookingFormValues, type PortalProfileFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Profile {
  Fullname: string;
  MRN: string;
  Phone?: string;
  Address?: string;
  InsuranceNumber?: string;
  Allergies?: string;
}

interface Department {
  ID: number | string;
  Name: string;
}

interface Doctor {
  id: number | string;
  fullname: string;
}

interface Slot {
  start_time: string;
}

interface Appointment {
  ID: number | string;
  DepartmentID: number | string;
  Department?: { Name?: string };
  Doctor?: { Fullname?: string };
  ScheduledAt: string;
  Reason?: string;
  Status: string;
}

interface PrescriptionItem {
  ID: number | string;
  Drug?: { Name?: string };
  DrugID: number | string;
  Dosage: string;
  Quantity: number;
  Instructions?: string;
}

interface Prescription {
  ID: number | string;
  EncounterID: number | string;
  Items?: PrescriptionItem[];
}

interface HistoryEncounter {
  ID: number | string;
  DepartmentID: number | string;
  Department?: { Name?: string };
  Type: string;
  Status: string;
  CheckedInAt: string;
  ClinicalNotes?: string;
}

interface PatientHistory {
  encounters?: HistoryEncounter[];
  prescriptions?: Prescription[];
}

interface InvoiceItem {
  ID: number | string;
  Description: string;
  Amount: number;
}

interface Invoice {
  ID: number | string;
  TotalAmount: number;
  CreatedAt: string;
  Status: string;
  Items?: InvoiceItem[];
}

interface Attachment {
  ID: number | string;
  FileName: string;
  Category: string;
  ContentType?: string;
  FileSize?: number;
  CreatedAt: string;
}

const TABS = [
  { key: 'appointments', label: 'Lịch hẹn' },
  { key: 'history', label: 'Lịch sử khám' },
  { key: 'invoices', label: 'Hóa đơn' },
  { key: 'attachments', label: 'Tệp đính kèm' },
  { key: 'profile', label: 'Hồ sơ của tôi' },
];

const STATUS_STYLES: Record<string, string> = {
  booked: 'bg-[#0d9488]/10 text-[#0d9488]',
  checked_in: 'bg-[#198754]/10 text-[#198754]',
  cancelled: 'bg-[#dc3545]/10 text-[#dc3545]',
  no_show: 'bg-[#6c757d]/10 text-[#6c757d]',
};

const PORTAL_INPUT = 'h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]';
const PORTAL_LABEL = 'mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]';
const PORTAL_ERROR = 'flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]';

export default function PortalHome() {
  const { logout } = usePatientAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, ConfirmDialog] = useConfirm();

  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentTotal, setAppointmentTotal] = useState(0);
  const [appointmentTotalPages, setAppointmentTotalPages] = useState(1);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('all');
  const [appointmentSortDir, setAppointmentSortDir] = useState<'asc' | 'desc'>('desc');
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
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

  const [tab, setTab] = useState('appointments');
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const {
    register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<PortalProfileFormValues>({
    resolver: zodResolver(portalProfileSchema),
    defaultValues: { phone: '', address: '', insurance_number: '', allergies: '' },
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getMyProfile();
      setProfile(me.data);
      resetProfile({
        phone: me.data.Phone ?? '',
        address: me.data.Address ?? '',
        insurance_number: me.data.InsuranceNumber ?? '',
        allergies: me.data.Allergies ?? '',
      });
      setProfileLoaded(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const result = await listMyAppointments({
        page: appointmentPage,
        status: appointmentStatusFilter === 'all' ? undefined : appointmentStatusFilter,
        sort_by: 'scheduled',
        sort_dir: appointmentSortDir,
      });
      setAppointments(result.data ?? []);
      setAppointmentTotal(result.meta?.total ?? 0);
      setAppointmentTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoadingAppointments(false);
    }
  }, [appointmentPage, appointmentStatusFilter, appointmentSortDir]);

  useEffect(() => {
    setAppointmentPage(1);
  }, [appointmentStatusFilter, appointmentSortDir]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    loadAll();
    getPortalDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
  }, [loadAll]);

  const handleLogout = async () => {
    const ok = await confirm('Bạn có chắc chắn muốn đăng xuất?', { title: 'Đăng xuất' });
    if (!ok) return;
    logout();
    navigate('/portal/login');
  };

  const openBooking = () => {
    resetBooking({ department_id: String(departments[0]?.ID ?? ''), doctor_id: '', type: 'new', reason: '' });
    setDoctors([]);
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    setFormError('');
    setModalOpen(true);
    if (departments[0]?.ID) {
      getPortalDoctors(departments[0].ID).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    }
  };

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
      await cancelMyAppointment(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleTabChange = (tabName: string) => {
    setTab(tabName);
    if (tabName === 'history' && !history) {
      setLoadingHistory(true);
      getMyHistory()
        .then(r => setHistory(r.data))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingHistory(false));
    }
    if (tabName === 'invoices' && !invoices) {
      setLoadingInvoices(true);
      getMyInvoices()
        .then(r => setInvoices(r.data ?? []))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingInvoices(false));
    }
    if (tabName === 'attachments' && !attachments) {
      setLoadingAttachments(true);
      listMyAttachments()
        .then(r => setAttachments(r.data ?? []))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingAttachments(false));
    }
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    setAttachmentError('');
    setOpeningAttachmentId(attachment.ID);
    try {
      const blob = await downloadMyAttachment(attachment.ID);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setAttachmentError(resolveError(err));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const handleProfileSave = handleProfileSubmit(async values => {
    setProfileError('');
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateMyProfile(values);
      const me = await getMyProfile();
      setProfile(me.data);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(resolveError(err));
    } finally {
      setSavingProfile(false);
    }
  });

  const canSubmitBooking = !!bookingDepartmentId && !!bookingDoctorId && !!selectedSlot;

  return (
    <div className="min-h-screen bg-[#f0fdfa]">
      <header className="flex items-center justify-between border-b border-[#d1fae5] bg-white px-8 py-4.5">
        <Link to="/" className="inline-flex items-center gap-2 no-underline opacity-90 transition-opacity hover:opacity-100">
          <Icon icon="fa6-solid:hospital" className="text-lg text-[#0d6b5f]" />
          <span className="text-lg font-bold text-[#0d6b5f]">SmartClinic</span>
          <span className="text-[13px] text-[#6c757d]">Cổng bệnh nhân</span>
        </Link>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="h-auto rounded-full border-[#d1fae5] px-4 py-2 text-[13px] font-medium text-[#6c757d]"
        >
          <Icon icon="fa6-solid:right-from-bracket" className="text-[13px]" />Đăng xuất
        </Button>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-8">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : (
          <>
            {error && <div className={cn(PORTAL_ERROR, 'mb-5')}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

            {profile && (
              <Card className="mb-1 rounded-2xl border-[#d1fae5] p-5">
                <h1 className="m-0 text-[22px] font-bold text-[#134e48]">Xin chào, {profile.Fullname}</h1>
                <p className="mt-1 mb-0 text-sm text-[#6c757d]">Mã hồ sơ: {profile.MRN}</p>
              </Card>
            )}

            <div className="mt-6 flex gap-1.5 border-b border-[#d1fae5]">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={cn(
                    'cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-[#6c757d]',
                    tab === t.key && 'border-[#0d9488] text-[#0d9488]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'appointments' && (
              <>
                <div className="my-4 flex items-center justify-between">
                  <h2 className="m-0 text-lg font-bold text-[#134e48]">Lịch hẹn của tôi</h2>
                  <Button
                    onClick={openBooking}
                    className="h-auto rounded-xl bg-[#0d9488] px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
                  >
                    <Icon icon="fa6-solid:plus" className="text-[13px]" /> Đặt lịch mới
                  </Button>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <Select value={appointmentStatusFilter} onValueChange={setAppointmentStatusFilter}>
                    <SelectTrigger className={cn(PORTAL_INPUT, 'w-auto')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="booked">Đã đặt</SelectItem>
                      <SelectItem value="checked_in">Đã check-in</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
                      <SelectItem value="no_show">Không đến</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAppointmentSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                    className="h-auto rounded-xl border-[#d1fae5] px-4 py-2.5 text-sm font-medium text-[#134e48]"
                  >
                    <Icon icon={appointmentSortDir === 'asc' ? 'fa6-solid:arrow-up-short-wide' : 'fa6-solid:arrow-down-wide-short'} className="text-xs" />
                    Ngày hẹn
                  </Button>
                </div>

                {loadingAppointments ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
                ) : appointments.length === 0 ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Bạn chưa có lịch hẹn nào.</Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {appointments.map(a => (
                      <Card key={a.ID} className="rounded-2xl border-[#d1fae5] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div>
                            <div className="font-bold text-[#134e48]">{a.Department?.Name ?? `Khoa #${a.DepartmentID}`}</div>
                            <div className="mt-1 text-[13px] text-[#6c757d]">
                              {a.Doctor?.Fullname ? `BS. ${a.Doctor.Fullname} · ` : ''}{new Date(a.ScheduledAt).toLocaleString('vi-VN')}
                            </div>
                            {a.Reason && <div className="mt-1 text-[13px] text-[#6c757d]">Lý do: {a.Reason}</div>}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[a.Status] ?? STATUS_STYLES.booked)}>
                              {appointmentStatusLabel(a.Status)}
                            </span>
                            {a.Status === 'booked' && (
                              <Button
                                variant="outline"
                                onClick={() => handleCancel(a)}
                                className="h-auto rounded-xl border-[#dc3545]/20 px-3.5 py-1.75 text-[13px] font-semibold text-[#dc3545] hover:bg-[#dc3545]/10"
                              >
                                Hủy
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {!loadingAppointments && appointmentTotal > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-sm text-[#6c757d]">
                      Trang {appointmentPage}/{appointmentTotalPages} · {appointmentTotal} lịch hẹn
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={appointmentPage <= 1}
                        onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}
                        className="h-auto rounded-full border-[#d1fae5] px-4 py-2 text-sm font-medium text-[#134e48]"
                      >
                        <Icon icon="fa6-solid:chevron-left" className="text-xs" />
                        Trước
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={appointmentPage >= appointmentTotalPages}
                        onClick={() => setAppointmentPage(p => Math.min(appointmentTotalPages, p + 1))}
                        className="h-auto rounded-full border-[#d1fae5] px-4 py-2 text-sm font-medium text-[#134e48]"
                      >
                        Sau
                        <Icon icon="fa6-solid:chevron-right" className="text-xs" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'history' && (
              <div className="mt-5">
                <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Lịch sử khám &amp; đơn thuốc</h2>
                {loadingHistory ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
                ) : !history || (history.encounters?.length ?? 0) === 0 ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Chưa có lượt khám nào.</Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {history.encounters!.map(enc => {
                      const rx = (history.prescriptions ?? []).filter(p => p.EncounterID === enc.ID);
                      return (
                        <Card key={enc.ID} className="rounded-2xl border-[#d1fae5] p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <div>
                              <div className="font-bold text-[#134e48]">{enc.Department?.Name ?? `Khoa #${enc.DepartmentID}`}</div>
                              <div className="mt-1 text-[13px] text-[#6c757d]">
                                {encounterTypeLabel(enc.Type)} · {new Date(enc.CheckedInAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[enc.Status === 'completed' ? 'booked' : enc.Status] ?? STATUS_STYLES.booked)}>
                              {encounterStatusLabel(enc.Status)}
                            </span>
                          </div>
                          {enc.ClinicalNotes && (
                            <div className="mt-2.5 text-[13px] text-[#134e48]">{enc.ClinicalNotes}</div>
                          )}
                          {rx.length > 0 && (
                            <div className="mt-3 border-t border-[#d1fae5] pt-3">
                              <div className="mb-1.5 text-[13px] font-bold text-[#134e48]">Đơn thuốc</div>
                              {rx.map(p => (
                                <ul key={p.ID} className="m-0 pl-4.5">
                                  {(p.Items ?? []).map(item => (
                                    <li key={item.ID} className="text-[13px] text-[#6c757d]">
                                      {item.Drug?.Name ?? `Thuốc #${item.DrugID}`} — {item.Dosage}, SL {item.Quantity}
                                      {item.Instructions ? ` (${item.Instructions})` : ''}
                                    </li>
                                  ))}
                                </ul>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'invoices' && (
              <div className="mt-5">
                <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Hóa đơn của tôi</h2>
                {loadingInvoices ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
                ) : !invoices || invoices.length === 0 ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Chưa có hóa đơn nào.</Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {invoices.map(inv => (
                      <Card key={inv.ID} className="rounded-2xl border-[#d1fae5] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div>
                            <div className="font-bold text-[#134e48]">
                              {inv.TotalAmount?.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="mt-1 text-[13px] text-[#6c757d]">
                              {new Date(inv.CreatedAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                          <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[inv.Status === 'paid' ? 'booked' : inv.Status === 'unpaid' ? 'no_show' : 'cancelled'])}>
                            {invoiceStatusLabel(inv.Status)}
                          </span>
                        </div>
                        {(inv.Items ?? []).length > 0 && (
                          <ul className="m-0 mt-2.5 pl-4.5">
                            {inv.Items!.map(item => (
                              <li key={item.ID} className="text-[13px] text-[#6c757d]">
                                {item.Description} — {item.Amount?.toLocaleString('vi-VN')} đ
                              </li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'attachments' && (
              <div className="mt-5">
                <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Tệp đính kèm của tôi</h2>
                {attachmentError && <div className={cn(PORTAL_ERROR, 'mb-4')}>{attachmentError}</div>}
                {loadingAttachments ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
                ) : !attachments || attachments.length === 0 ? (
                  <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Chưa có tệp đính kèm nào.</Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {attachments.map(a => (
                      <Card key={a.ID} className="rounded-2xl border-[#d1fae5] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="overflow-hidden font-bold text-ellipsis whitespace-nowrap text-[#134e48]">{a.FileName}</div>
                            <div className="mt-1 text-[13px] text-[#6c757d]">
                              <span className="inline-block rounded-full bg-[#0d9488]/10 px-2 py-0.5 text-xs font-semibold text-[#0d9488]">{attachmentCategoryLabel(a.Category)}</span>
                              {' · '}{new Date(a.CreatedAt).toLocaleDateString('vi-VN')}
                              {a.FileSize ? ` · ${(a.FileSize / 1024).toFixed(0)} KB` : ''}
                            </div>
                          </div>
                          <Button
                            type="button"
                            disabled={openingAttachmentId === a.ID}
                            onClick={() => handleViewAttachment(a)}
                            className="h-auto shrink-0 rounded-full bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
                          >
                            {openingAttachmentId === a.ID ? 'Đang mở…' : 'Xem'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && profileLoaded && (
              <div className="mt-5 max-w-[480px]">
                <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Hồ sơ của tôi</h2>
                <Card className="rounded-2xl border-[#d1fae5] p-5">
                  <form onSubmit={handleProfileSave} noValidate>
                    <label className={PORTAL_LABEL}>Số điện thoại</label>
                    <Input
                      {...registerProfile('phone')}
                      aria-invalid={!!profileErrors.phone}
                      className={PORTAL_INPUT}
                    />
                    <FieldError message={profileErrors.phone?.message} />
                    <label className={PORTAL_LABEL}>Địa chỉ</label>
                    <Input
                      {...registerProfile('address')}
                      className={PORTAL_INPUT}
                    />
                    <label className={PORTAL_LABEL}>Số thẻ BHYT</label>
                    <Input
                      {...registerProfile('insurance_number')}
                      className={PORTAL_INPUT}
                    />
                    <label className={PORTAL_LABEL}>Dị ứng</label>
                    <Input
                      {...registerProfile('allergies')}
                      className={PORTAL_INPUT}
                    />

                    {profileError && <div className={cn(PORTAL_ERROR, 'mt-4')}>{profileError}</div>}
                    {profileSaved && (
                      <div className="mt-4 text-[13px] font-semibold text-[#0d9488]">
                        Đã lưu thay đổi.
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="mt-5 h-auto w-full justify-center rounded-xl bg-[#0d9488] py-3 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
                    >
                      {savingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </Button>
                  </form>
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      <Dialog open={modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
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
                <Input type="date" value={slotDate} onChange={e => handleSlotDateChange(e.target.value)} className={PORTAL_INPUT} min={new Date().toISOString().slice(0, 10)} />
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

            {formError && <div className={cn(PORTAL_ERROR, 'mt-4')}>{formError}</div>}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
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

      {ConfirmDialog}
    </div>
  );
}
