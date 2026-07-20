import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getAdmissionById, transferAdmission, dischargeAdmission,
  listProgressNotes, addProgressNote, listNursingLogs, addNursingLog,
  listAdmissionVitals, recordAdmissionVital,
} from '@/api/admission';
import { getDepartments } from '@/api/department';
import { listWards } from '@/api/ward';
import { listBeds } from '@/api/bed';
import { useAuth } from '@/context/AuthContext';
import { resolveError } from '@/utils/errorMessages';
import { admissionTypeLabel, encounterTypeLabel } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Department {
  ID: number | string;
  Name: string;
}

interface Ward {
  ID: number | string;
  Name: string;
}

interface Bed {
  ID: number | string;
  BedNumber: string;
}

interface ProgressNote {
  ID: number | string;
  Content: string;
  DoctorOrders?: string;
  RecordedAt: string;
}

interface NursingLog {
  ID: number | string;
  Action: string;
  Notes?: string;
  PerformedAt: string;
}

interface VitalSign {
  ID: number | string;
  Temperature: number;
  Pulse: number;
  BloodPressureSystolic: number;
  BloodPressureDiastolic: number;
  RespiratoryRate: number;
  SpO2: number;
  RecordedAt: string;
}

interface Admission {
  ID: number | string;
  EncounterID: number | string;
  AdmissionType: string;
  AdmittedAt: string;
  DischargedAt?: string | null;
  DischargeSummary?: string;
  Ward?: { Name?: string; BedNumber?: string };
  Bed?: { BedNumber?: string };
  Encounter?: {
    Type?: string;
    PatientID?: number | string;
    Department?: { Name?: string };
    Patient?: { Fullname?: string; MRN?: string; Allergies?: string };
  };
}

export default function AdmissionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = ['admin', 'doctor', 'nurse'].includes(role ?? '');
  const canDischarge = ['admin', 'doctor'].includes(role ?? '');
  const canAddProgressNote = ['admin', 'doctor'].includes(role ?? '');
  const canAddNursingLog = ['admin', 'nurse'].includes(role ?? '');
  const canAddVital = ['admin', 'doctor', 'nurse'].includes(role ?? '');

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);
  const [nursingLogs, setNursingLogs] = useState<NursingLog[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, p, n, v] = await Promise.all([
        getAdmissionById(id),
        listProgressNotes(id),
        listNursingLogs(id),
        listAdmissionVitals(id),
      ]);
      setAdmission(a.data);
      setProgressNotes(p.data ?? []);
      setNursingLogs(n.data ?? []);
      setVitals(v.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }
  if (error && !admission) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
        <Icon icon="fa6-solid:circle-exclamation" />{error}
      </div>
    );
  }
  if (!admission) return null;

  const isDischarged = !!admission.DischargedAt;
  const patient = admission.Encounter?.Patient;

  return (
    <>
      <Link to="/admissions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#307bc4] no-underline">
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Danh sách nội trú
      </Link>

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-[22px] font-bold text-[#274760]">{patient?.Fullname ?? `Bệnh nhân #${admission.Encounter?.PatientID}`}</h1>
            <p className="mt-1 mb-0 text-sm text-[#6c757d]">
              MRN: {patient?.MRN ?? '—'} · {admission.Encounter?.Department?.Name ?? '—'} · {admissionTypeLabel(admission.AdmissionType)} · Nhập viện {new Date(admission.AdmittedAt).toLocaleString('vi-VN')}
            </p>
            <p className="mt-1 mb-0 text-sm text-[#6c757d]">
              Vị trí hiện tại: {admission.Ward?.Name ?? 'Chưa xếp khu'} {admission.Bed ? `· Giường ${admission.Bed.BedNumber}` : '· Chưa xếp giường'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', isDischarged ? 'bg-[#6c757d]/10 text-[#6c757d]' : 'bg-[#198754]/10 text-[#198754]')}>
              {isDischarged ? 'Đã xuất viện' : 'Đang điều trị'}
            </span>
            {canManage && (
              <Button asChild variant="outline" className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]">
                <Link to={`/encounters/${admission.EncounterID}`}>
                  <Icon icon="fa6-solid:stethoscope" className="text-xs" />Hồ sơ khám ({encounterTypeLabel(admission.Encounter?.Type)})
                </Link>
              </Button>
            )}
          </div>
        </div>
        {patient?.Allergies && (
          <div className="mt-3.5 rounded-lg bg-[#dc3545]/8 px-3.5 py-2.5 text-[13px] font-semibold text-[#dc3545]">
            <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Dị ứng: {patient.Allergies}
          </div>
        )}
        {isDischarged && admission.DischargeSummary && (
          <div className="mt-3.5 rounded-lg bg-[#f4f7fa] px-3.5 py-2.5 text-[13px] text-[#274760]">
            <strong>Tóm tắt xuất viện:</strong> {admission.DischargeSummary}
          </div>
        )}
        {error && (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{error}</div>
        )}
      </Card>

      {!isDischarged && canManage && (
        <TransferDischargeSection
          admission={admission}
          canDischarge={canDischarge}
          onChanged={loadAll}
          onDischarged={() => navigate('/admissions')}
        />
      )}

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-5">
        <VitalSignsSection admissionId={id} vitals={vitals} canAdd={canAddVital && !isDischarged} onAdded={loadAll} />
        <ProgressNotesSection admissionId={id} notes={progressNotes} canAdd={canAddProgressNote && !isDischarged} onAdded={loadAll} />
        <NursingLogsSection admissionId={id} logs={nursingLogs} progressNotes={progressNotes} canAdd={canAddNursingLog && !isDischarged} onAdded={loadAll} />
      </div>
    </>
  );
}

interface TransferDischargeSectionProps {
  admission: Admission;
  canDischarge: boolean;
  onChanged: () => Promise<void>;
  onDischarged: () => void;
}

function TransferDischargeSection({ admission, canDischarge, onChanged, onDischarged }: TransferDischargeSectionProps) {
  const [mode, setMode] = useState<'transfer' | 'discharge' | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [form, setForm] = useState({ department_id: '', ward_id: '', bed_id: '', reason: '' });
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const toggleTransfer = () => {
    if (mode === 'transfer') {
      setMode(null);
      return;
    }
    setForm({ department_id: '', ward_id: '', bed_id: '', reason: '' });
    setWards([]);
    setBeds([]);
    setFormError('');
    setMode('transfer');
  };

  const toggleDischarge = () => {
    setFormError('');
    setMode(mode === 'discharge' ? null : 'discharge');
  };

  const handleWardChange = async (wardId: string) => {
    setForm(f => ({ ...f, ward_id: wardId, bed_id: '' }));
    if (!wardId) {
      setBeds([]);
      return;
    }
    try {
      const result = await listBeds({ ward_id: wardId, status: 'available' });
      setBeds(result.data ?? []);
    } catch {
      setBeds([]);
    }
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setForm(f => ({ ...f, department_id: departmentId, ward_id: '', bed_id: '' }));
    setBeds([]);
    if (!departmentId) {
      setWards([]);
      return;
    }
    try {
      const result = await listWards(departmentId);
      setWards(result.data ?? []);
    } catch {
      setWards([]);
    }
  };

  const handleTransfer = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await transferAdmission(admission.ID, {
        ward_id: form.ward_id ? Number(form.ward_id) : undefined,
        bed_id: form.bed_id ? Number(form.bed_id) : undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        reason: form.reason,
      });
      setMode(null);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDischarge = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await dischargeAdmission(admission.ID, dischargeSummary);
      onDischarged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
      <div className={cn('flex items-center justify-between', mode && 'mb-3.5')}>
        <h2 className="m-0 text-[17px] font-bold text-[#274760]">Chuyển khoa/giường & Xuất viện</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={toggleTransfer}
            className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
          >
            <Icon icon="fa6-solid:right-left" className="text-xs" />Chuyển giường
          </Button>
          {canDischarge && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleDischarge}
              className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#dc3545]"
            >
              <Icon icon="fa6-solid:door-open" className="text-xs" />Xuất viện
            </Button>
          )}
        </div>
      </div>

      {mode === 'transfer' && (
        <form onSubmit={handleTransfer} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Khoa mới (bỏ trống nếu không đổi khoa)</label>
          <Select value={form.department_id} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="h-auto w-full rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
              <SelectValue placeholder="-- Giữ nguyên khoa --" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Khu điều trị mới</label>
          <Select value={form.ward_id} onValueChange={handleWardChange} disabled={wards.length === 0}>
            <SelectTrigger className="h-auto w-full rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
              <SelectValue placeholder="-- Bỏ xếp khu --" />
            </SelectTrigger>
            <SelectContent>
              {wards.map(w => <SelectItem key={w.ID} value={String(w.ID)}>{w.Name}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Giường mới</label>
          <Select value={form.bed_id} onValueChange={value => setForm({ ...form, bed_id: value })} disabled={beds.length === 0}>
            <SelectTrigger className="h-auto w-full rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
              <SelectValue placeholder="-- Bỏ xếp giường --" />
            </SelectTrigger>
            <SelectContent>
              {beds.map(b => <SelectItem key={b.ID} value={String(b.ID)}>Giường {b.BedNumber}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Lý do</label>
          <Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />

          {formError && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{formError}</div>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            {saving ? 'Đang lưu…' : 'Xác nhận chuyển'}
          </Button>
        </form>
      )}

      {mode === 'discharge' && (
        <form onSubmit={handleDischarge} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tóm tắt bệnh án xuất viện *</label>
          <Textarea required value={dischargeSummary} onChange={e => setDischargeSummary(e.target.value)} className="min-h-[90px] rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          {formError && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{formError}</div>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="mt-3 h-auto rounded-full bg-[#dc3545] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#dc3545]/90"
          >
            {saving ? 'Đang lưu…' : 'Xác nhận xuất viện'}
          </Button>
        </form>
      )}
    </Card>
  );
}

const EMPTY_VITAL_FORM = {
  temperature: '', pulse: '', blood_pressure_systolic: '', blood_pressure_diastolic: '', respiratory_rate: '', spo2: '',
};

interface VitalSignsSectionProps {
  admissionId: string;
  vitals: VitalSign[];
  canAdd: boolean;
  onAdded: () => Promise<void>;
}

function VitalSignsSection({ admissionId, vitals, canAdd, onAdded }: VitalSignsSectionProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_VITAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await recordAdmissionVital(admissionId, {
        temperature: Number(form.temperature) || 0,
        pulse: Number(form.pulse) || 0,
        blood_pressure_systolic: Number(form.blood_pressure_systolic) || 0,
        blood_pressure_diastolic: Number(form.blood_pressure_diastolic) || 0,
        respiratory_rate: Number(form.respiratory_rate) || 0,
        spo2: Number(form.spo2) || 0,
      });
      setForm(EMPTY_VITAL_FORM);
      setOpen(false);
      await onAdded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader title="Sinh hiệu" canAct={canAdd} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Ghi sinh hiệu" />
      {vitals.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có chỉ số sinh hiệu nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {vitals.map(v => (
            <li key={v.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div>
                <div className="font-semibold text-[#274760]">
                  {v.Temperature}°C · M {v.Pulse} · HA {v.BloodPressureSystolic}/{v.BloodPressureDiastolic} · NT {v.RespiratoryRate} · SpO2 {v.SpO2}%
                </div>
                <div className="text-xs text-[#6c757d]">{new Date(v.RecordedAt).toLocaleString('vi-VN')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canAdd && (
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Nhiệt độ (°C)</label>
              <Input type="number" step="0.1" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Mạch (lần/phút)</label>
              <Input type="number" value={form.pulse} onChange={e => setForm({ ...form, pulse: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Huyết áp tâm thu</label>
              <Input type="number" value={form.blood_pressure_systolic} onChange={e => setForm({ ...form, blood_pressure_systolic: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Huyết áp tâm trương</label>
              <Input type="number" value={form.blood_pressure_diastolic} onChange={e => setForm({ ...form, blood_pressure_diastolic: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Nhịp thở (lần/phút)</label>
              <Input type="number" value={form.respiratory_rate} onChange={e => setForm({ ...form, respiratory_rate: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">SpO2 (%)</label>
              <Input type="number" value={form.spo2} onChange={e => setForm({ ...form, spo2: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
          </div>
          {formError && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{formError}</div>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            {saving ? 'Đang lưu…' : 'Lưu sinh hiệu'}
          </Button>
        </form>
      )}
    </Card>
  );
}

interface ProgressNotesSectionProps {
  admissionId: string;
  notes: ProgressNote[];
  canAdd: boolean;
  onAdded: () => Promise<void>;
}

function ProgressNotesSection({ admissionId, notes, canAdd, onAdded }: ProgressNotesSectionProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ content: '', doctor_orders: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await addProgressNote(admissionId, form);
      setForm({ content: '', doctor_orders: '' });
      setOpen(false);
      await onAdded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader title="Diễn biến & Y lệnh" canAct={canAdd} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Ghi diễn biến" />
      {notes.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có ghi nhận diễn biến.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {notes.map(n => (
            <li key={n.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div>
                <div className="font-semibold text-[#274760]">{n.Content}</div>
                {n.DoctorOrders && <div className="text-[13px] text-[#6c757d]">Y lệnh: {n.DoctorOrders}</div>}
                <div className="text-xs text-[#6c757d]">{new Date(n.RecordedAt).toLocaleString('vi-VN')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canAdd && (
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Diễn biến bệnh *</label>
          <Textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="min-h-[70px] rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Y lệnh trong ngày</label>
          <Textarea value={form.doctor_orders} onChange={e => setForm({ ...form, doctor_orders: e.target.value })} className="min-h-[70px] rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          {formError && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{formError}</div>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            {saving ? 'Đang lưu…' : 'Lưu diễn biến'}
          </Button>
        </form>
      )}
    </Card>
  );
}

interface NursingLogsSectionProps {
  admissionId: string;
  logs: NursingLog[];
  progressNotes: ProgressNote[];
  canAdd: boolean;
  onAdded: () => Promise<void>;
}

function NursingLogsSection({ admissionId, logs, progressNotes, canAdd, onAdded }: NursingLogsSectionProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ progress_note_id: '', action: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await addNursingLog(admissionId, {
        progress_note_id: form.progress_note_id ? Number(form.progress_note_id) : undefined,
        action: form.action,
        notes: form.notes,
      });
      setForm({ progress_note_id: '', action: '', notes: '' });
      setOpen(false);
      await onAdded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader title="Nhật ký điều dưỡng" canAct={canAdd} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Ghi thực hiện" />
      {logs.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có nhật ký nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {logs.map(l => (
            <li key={l.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div>
                <div className="font-semibold text-[#274760]">{l.Action}</div>
                {l.Notes && <div className="text-[13px] text-[#6c757d]">{l.Notes}</div>}
                <div className="text-xs text-[#6c757d]">{new Date(l.PerformedAt).toLocaleString('vi-VN')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canAdd && (
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Y lệnh liên quan</label>
          <Select value={form.progress_note_id} onValueChange={value => setForm({ ...form, progress_note_id: value })}>
            <SelectTrigger className="h-auto w-full rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
              <SelectValue placeholder="-- Không gắn y lệnh --" />
            </SelectTrigger>
            <SelectContent>
              {progressNotes.map(n => <SelectItem key={n.ID} value={String(n.ID)}>{n.DoctorOrders || n.Content}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Hành động *</label>
          <Input required placeholder="VD: Tiêm thuốc, truyền dịch, thay băng…" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Ghi chú</label>
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          {formError && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{formError}</div>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            {saving ? 'Đang lưu…' : 'Lưu nhật ký'}
          </Button>
        </form>
      )}
    </Card>
  );
}

interface SectionHeaderProps {
  title: string;
  canAct: boolean;
  open: boolean;
  onToggle: () => void;
  actionLabel: string;
}

function SectionHeader({ title, canAct, open, onToggle, actionLabel }: SectionHeaderProps): ReactNode {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <h2 className="m-0 text-[17px] font-bold text-[#274760]">{title}</h2>
      {canAct && (
        <Button
          type="button"
          variant="outline"
          onClick={onToggle}
          className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
        >
          <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:plus'} className="text-xs" />
          {open ? 'Đóng' : actionLabel}
        </Button>
      )}
    </div>
  );
}
