import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getMyProfile, getPortalDepartments, getPortalDoctors, getPortalAvailableSlots,
  listMyAppointments, bookMyAppointment, cancelMyAppointment,
  getMyHistory, getMyInvoices, updateMyProfile,
} from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import {
  appointmentStatusLabel, encounterStatusLabel, encounterTypeLabel, invoiceStatusLabel,
} from '@/utils/labels';
import { usePatientAuth } from '@/context/PatientAuthContext';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface ProfileForm {
  phone: string;
  address: string;
  insurance_number: string;
  allergies: string;
}

const TABS = [
  { key: 'appointments', label: 'Lịch hẹn' },
  { key: 'history', label: 'Lịch sử khám' },
  { key: 'invoices', label: 'Hóa đơn' },
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

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ department_id: '', doctor_id: '', reason: '' });
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState('appointments');
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [me, appts] = await Promise.all([getMyProfile(), listMyAppointments()]);
      setProfile(me.data);
      setProfileForm({
        phone: me.data.Phone ?? '',
        address: me.data.Address ?? '',
        insurance_number: me.data.InsuranceNumber ?? '',
        allergies: me.data.Allergies ?? '',
      });
      setAppointments(appts.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    getPortalDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
  }, [loadAll]);

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const openBooking = () => {
    setForm({ department_id: String(departments[0]?.ID ?? ''), doctor_id: '', reason: '' });
    setDoctors([]);
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    setManualDate(''); setManualTime('');
    setFormError('');
    setModalOpen(true);
    if (departments[0]?.ID) {
      getPortalDoctors(departments[0].ID).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    }
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setForm(f => ({ ...f, department_id: departmentId, doctor_id: '' }));
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    setManualDate(''); setManualTime('');
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
    setForm(f => ({ ...f, doctor_id: doctorId }));
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    setManualDate(''); setManualTime('');
  };

  const handleSlotDateChange = async (date: string) => {
    setSlotDate(date);
    setSlots([]);
    setSelectedSlot(null);
    if (!date || !form.doctor_id) return;
    setLoadingSlots(true);
    try {
      const result = await getPortalAvailableSlots(form.doctor_id, date);
      setSlots(result.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    let scheduledAt: string;
    if (form.doctor_id) {
      if (!selectedSlot) {
        setFormError('Vui lòng chọn một khung giờ.');
        return;
      }
      scheduledAt = selectedSlot.start_time;
    } else {
      if (!manualDate || !manualTime) {
        setFormError('Vui lòng chọn ngày và giờ mong muốn.');
        return;
      }
      const parsed = new Date(`${manualDate}T${manualTime}:00`);
      if (parsed.getTime() <= Date.now()) {
        setFormError('Vui lòng chọn thời điểm trong tương lai.');
        return;
      }
      scheduledAt = parsed.toISOString();
    }

    setSaving(true);
    try {
      await bookMyAppointment({
        department_id: Number(form.department_id),
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        scheduled_at: scheduledAt,
        reason: form.reason,
      });
      await loadAll();
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (appt: Appointment) => {
    if (!(await confirm('Hủy lịch hẹn này?', { confirmLabel: 'Hủy lịch' }))) return;
    try {
      await cancelMyAppointment(appt.ID);
      await loadAll();
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
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    if (!profileForm) return;
    setSavingProfile(true);
    try {
      await updateMyProfile(profileForm);
      const me = await getMyProfile();
      setProfile(me.data);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(resolveError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const canSubmitBooking = !!form.department_id
    && (form.doctor_id ? !!selectedSlot : !!(manualDate && manualTime));

  return (
    <div className="min-h-screen bg-[#f0fdfa]">
      <header className="flex items-center justify-between border-b border-[#d1fae5] bg-white px-8 py-4.5">
        <Link to="/" className="inline-flex items-center gap-2 no-underline">
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
                    className="h-auto rounded-full bg-[#0d9488] px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
                  >
                    <Icon icon="fa6-solid:plus" className="text-[13px]" /> Đặt lịch mới
                  </Button>
                </div>

                {appointments.length === 0 ? (
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
                                className="h-auto rounded-full border-[#dc3545]/20 px-3.5 py-1.75 text-[13px] font-semibold text-[#dc3545] hover:bg-[#dc3545]/10"
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

            {tab === 'profile' && profileForm && (
              <div className="mt-5 max-w-[480px]">
                <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Hồ sơ của tôi</h2>
                <Card className="rounded-2xl border-[#d1fae5] p-5">
                  <form onSubmit={handleProfileSave}>
                    <label className={PORTAL_LABEL}>Số điện thoại</label>
                    <Input
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className={PORTAL_INPUT}
                    />
                    <label className={PORTAL_LABEL}>Địa chỉ</label>
                    <Input
                      value={profileForm.address}
                      onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                      className={PORTAL_INPUT}
                    />
                    <label className={PORTAL_LABEL}>Số thẻ BHYT</label>
                    <Input
                      value={profileForm.insurance_number}
                      onChange={e => setProfileForm({ ...profileForm, insurance_number: e.target.value })}
                      className={PORTAL_INPUT}
                    />
                    <label className={PORTAL_LABEL}>Dị ứng</label>
                    <Input
                      value={profileForm.allergies}
                      onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })}
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
                      className="mt-5 h-auto w-full justify-center rounded-full bg-[#0d9488] py-3 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
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
          <form onSubmit={handleBook}>
            <label className={PORTAL_LABEL}>Khoa *</label>
            <Select value={form.department_id ? String(form.department_id) : ''} onValueChange={handleDepartmentChange}>
              <SelectTrigger className={cn(PORTAL_INPUT, 'w-full')}>
                <SelectValue placeholder="-- Chọn khoa --" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className={PORTAL_LABEL}>Bác sĩ (tùy chọn)</label>
            <Select
              value={form.doctor_id ? String(form.doctor_id) : 'any'}
              onValueChange={value => handleDoctorChange(value === 'any' ? '' : value)}
              disabled={doctors.length === 0}
            >
              <SelectTrigger className={cn(PORTAL_INPUT, 'w-full')}>
                <SelectValue placeholder="-- Bác sĩ bất kỳ --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">-- Bác sĩ bất kỳ --</SelectItem>
                {doctors.map(doc => (
                  <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {doctors.length === 0 && (
              <p className="mt-2 text-[13px] text-[#dc3545]">
                Khoa này hiện chưa có bác sĩ nào — vui lòng chọn khoa khác.
              </p>
            )}

            {form.doctor_id && (
              <>
                <label className={PORTAL_LABEL}>Chọn ngày khám</label>
                <Input type="date" value={slotDate} onChange={e => handleSlotDateChange(e.target.value)} className={PORTAL_INPUT} min={new Date().toISOString().slice(0, 10)} />
                {loadingSlots && <p className="mt-2 text-[13px] text-[#6c757d]">Đang tải khung giờ…</p>}
                {!loadingSlots && slotDate && slots.length === 0 && (
                  <div className="mt-2 rounded-lg border border-[#dc3545]/20 bg-[#dc3545]/6 px-3 py-2.5">
                    <p className="m-0 text-[13px] font-semibold text-[#dc3545]">
                      Bác sĩ không có khung giờ trống ngày này.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDoctorChange('')}
                      className="mt-1.5 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#0d9488] underline"
                    >
                      Đặt lịch không cần chọn bác sĩ cụ thể
                    </button>
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

            {!form.doctor_id && form.department_id && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={PORTAL_LABEL}>Ngày mong muốn</label>
                    <Input
                      type="date"
                      required
                      value={manualDate}
                      onChange={e => setManualDate(e.target.value)}
                      className={PORTAL_INPUT}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div>
                    <label className={PORTAL_LABEL}>Giờ mong muốn</label>
                    <Input
                      type="time"
                      required
                      value={manualTime}
                      onChange={e => setManualTime(e.target.value)}
                      className={PORTAL_INPUT}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-[#6c757d]">
                  Chưa chọn bác sĩ cụ thể — phòng khám sẽ sắp xếp bác sĩ phù hợp cho lịch hẹn của bạn.
                </p>
              </>
            )}

            <label className={PORTAL_LABEL}>Lý do khám</label>
            <Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={PORTAL_INPUT} />

            {formError && <div className={cn(PORTAL_ERROR, 'mt-4')}>{formError}</div>}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto rounded-full border-[#d1fae5] px-5 py-2.5 text-sm font-medium text-[#134e48]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !canSubmitBooking}
                className="h-auto rounded-full bg-[#0d9488] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
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
