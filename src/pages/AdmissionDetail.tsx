import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { toneBadgeClass, allergyWarningClass } from '@/utils/badgeStyles';
import { cn } from '@/lib/utils';
import {
  transferSchema, dischargeSchema, admissionVitalSchema, progressNoteSchema, nursingLogSchema,
  type TransferFormValues, type DischargeFormValues, type AdmissionVitalFormValues,
  type ProgressNoteFormValues, type NursingLogFormValues,
} from '@/schemas/admissionDetail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FieldError from '@/components/FieldError';
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
      const a = await getAdmissionById(id);
      setAdmission(a.data);
    } catch (err) {
      setError(resolveError(err));
      setLoading(false);
      return;
    }

    // These are fetched independently: a role that can view the admission
    // (e.g. receptionist) may not have access to every sub-resource (e.g.
    // vitals is doctor/nurse/admin-only), and that shouldn't block the
    // whole page behind a single forbidden error.
    listProgressNotes(id).then(r => setProgressNotes(r.data ?? [])).catch(() => setProgressNotes([]));
    listNursingLogs(id).then(r => setNursingLogs(r.data ?? [])).catch(() => setNursingLogs([]));
    if (canAddVital) {
      listAdmissionVitals(id).then(r => setVitals(r.data ?? [])).catch(() => setVitals([]));
    } else {
      setVitals([]);
    }
    setLoading(false);
  }, [id, canAddVital]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }
  if (error && !admission) {
    return <ErrorAlert>{error}</ErrorAlert>;
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
            <span className={toneBadgeClass(isDischarged ? 'neutral' : 'success')}>
              {isDischarged ? 'Đã xuất viện' : 'Đang điều trị'}
            </span>
            {canManage && (
              <Button asChild variant="outline" className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]">
                <Link to={`/encounters/${admission.EncounterID}`}>
                  <Icon icon="fa6-solid:stethoscope" className="text-xs" />Hồ sơ khám ({encounterTypeLabel(admission.Encounter?.Type)})
                </Link>
              </Button>
            )}
          </div>
        </div>
        {patient?.Allergies && (
          <div className={cn('mt-3.5', allergyWarningClass)}>
            <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Dị ứng: {patient.Allergies}
          </div>
        )}
        {isDischarged && admission.DischargeSummary && (
          <div className="mt-3.5 rounded-lg bg-[#f4f7fa] px-3.5 py-2.5 text-[13px] text-[#274760]">
            <strong>Tóm tắt xuất viện:</strong> {admission.DischargeSummary}
          </div>
        )}
        {error && (
          <ErrorAlert icon={false} className="mt-3.5">{error}</ErrorAlert>
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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    control: transferControl, register: registerTransfer, handleSubmit: handleTransferSubmit,
    reset: resetTransfer, setValue: setTransferValue,
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { department_id: '', ward_id: '', bed_id: '', reason: '' },
  });
  const {
    register: registerDischarge, handleSubmit: handleDischargeSubmit,
    formState: { errors: dischargeErrors },
  } = useForm<DischargeFormValues>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: { summary: '' },
  });

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const toggleTransfer = () => {
    if (mode === 'transfer') {
      setMode(null);
      return;
    }
    resetTransfer({ department_id: '', ward_id: '', bed_id: '', reason: '' });
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
    setTransferValue('ward_id', wardId);
    setTransferValue('bed_id', '');
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
    setTransferValue('department_id', departmentId);
    setTransferValue('ward_id', '');
    setTransferValue('bed_id', '');
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

  const handleTransfer = handleTransferSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await transferAdmission(admission.ID, {
        ward_id: values.ward_id ? Number(values.ward_id) : undefined,
        bed_id: values.bed_id ? Number(values.bed_id) : undefined,
        department_id: values.department_id ? Number(values.department_id) : undefined,
        reason: values.reason,
      });
      setMode(null);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleDischarge = handleDischargeSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await dischargeAdmission(admission.ID, values.summary);
      onDischarged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
      <div className={cn('flex items-center justify-between', mode && 'mb-3.5')}>
        <h2 className="m-0 text-[17px] font-bold text-[#274760]">Chuyển khoa/giường & Xuất viện</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={toggleTransfer}
            className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
          >
            <Icon icon="fa6-solid:right-left" className="text-xs" />Chuyển giường
          </Button>
          {canDischarge && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleDischarge}
              className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#dc3545]"
            >
              <Icon icon="fa6-solid:door-open" className="text-xs" />Xuất viện
            </Button>
          )}
        </div>
      </div>

      {mode === 'transfer' && (
        <form onSubmit={handleTransfer} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Khoa mới (bỏ trống nếu không đổi khoa)</label>
          <Controller
            control={transferControl}
            name="department_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                  <SelectValue placeholder="-- Giữ nguyên khoa --" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Khu điều trị mới</label>
          <Controller
            control={transferControl}
            name="ward_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleWardChange} disabled={wards.length === 0}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                  <SelectValue placeholder="-- Bỏ xếp khu --" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map(w => <SelectItem key={w.ID} value={String(w.ID)}>{w.Name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Giường mới</label>
          <Controller
            control={transferControl}
            name="bed_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={beds.length === 0}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                  <SelectValue placeholder="-- Bỏ xếp giường --" />
                </SelectTrigger>
                <SelectContent>
                  {beds.map(b => <SelectItem key={b.ID} value={String(b.ID)}>Giường {b.BedNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Lý do</label>
          <Input {...registerTransfer('reason')} placeholder="VD: Cần theo dõi chuyên khoa sâu hơn" className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />

          {formError && (
            <ErrorAlert icon={false} className="mt-2.5">{formError}</ErrorAlert>
          )}
          <Button
            type="submit"
            disabled={saving}
            size="cta" className="mt-3"
          >
            {saving ? 'Đang lưu…' : 'Xác nhận chuyển'}
          </Button>
        </form>
      )}

      {mode === 'discharge' && (
        <form onSubmit={handleDischarge} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tóm tắt bệnh án xuất viện *</label>
          <Textarea {...registerDischarge('summary')} placeholder="VD: Chẩn đoán, quá trình điều trị, tình trạng khi ra viện, hướng dẫn theo dõi tại nhà…" aria-invalid={!!dischargeErrors.summary} className="min-h-[90px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          <FieldError message={dischargeErrors.summary?.message} />
          {formError && (
            <ErrorAlert icon={false} className="mt-2.5">{formError}</ErrorAlert>
          )}
          <Button
            type="submit"
            disabled={saving}
            variant="danger"
            size="cta"
            className="mt-3"
          >
            {saving ? 'Đang lưu…' : 'Xác nhận xuất viện'}
          </Button>
        </form>
      )}
    </Card>
  );
}

const EMPTY_VITAL_FORM: AdmissionVitalFormValues = {
  temperature: 0, pulse: 0, blood_pressure_systolic: 0, blood_pressure_diastolic: 0, respiratory_rate: 0, spo2: 0,
};

interface VitalSignsSectionProps {
  admissionId: string;
  vitals: VitalSign[];
  canAdd: boolean;
  onAdded: () => Promise<void>;
}

function VitalSignsSection({ admissionId, vitals, canAdd, onAdded }: VitalSignsSectionProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<AdmissionVitalFormValues>({
    resolver: zodResolver(admissionVitalSchema),
    defaultValues: EMPTY_VITAL_FORM,
  });

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await recordAdmissionVital(admissionId, values);
      reset(EMPTY_VITAL_FORM);
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
        <form onSubmit={handleFormSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Nhiệt độ (°C)</label>
              <Input type="number" step="0.1" {...register('temperature', { valueAsNumber: true })} aria-invalid={!!errors.temperature} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Mạch (lần/phút)</label>
              <Input type="number" {...register('pulse', { valueAsNumber: true })} aria-invalid={!!errors.pulse} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Huyết áp tâm thu</label>
              <Input type="number" {...register('blood_pressure_systolic', { valueAsNumber: true })} aria-invalid={!!errors.blood_pressure_systolic} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Huyết áp tâm trương</label>
              <Input type="number" {...register('blood_pressure_diastolic', { valueAsNumber: true })} aria-invalid={!!errors.blood_pressure_diastolic} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Nhịp thở (lần/phút)</label>
              <Input type="number" {...register('respiratory_rate', { valueAsNumber: true })} aria-invalid={!!errors.respiratory_rate} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
            <div>
              <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">SpO2 (%)</label>
              <Input type="number" {...register('spo2', { valueAsNumber: true })} aria-invalid={!!errors.spo2} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
            </div>
          </div>
          {formError && (
            <ErrorAlert icon={false} className="mt-2.5">{formError}</ErrorAlert>
          )}
          <Button
            type="submit"
            disabled={saving}
            size="cta" className="mt-3"
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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<ProgressNoteFormValues>({
    resolver: zodResolver(progressNoteSchema),
    defaultValues: { content: '', doctor_orders: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await addProgressNote(admissionId, values);
      reset({ content: '', doctor_orders: '' });
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
        <form onSubmit={handleFormSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Diễn biến bệnh *</label>
          <Textarea {...register('content')} placeholder="VD: Bệnh nhân tỉnh táo, sinh hiệu ổn định, ăn uống tốt…" aria-invalid={!!errors.content} className="min-h-[70px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          <FieldError message={errors.content?.message} />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Y lệnh trong ngày</label>
          <Textarea {...register('doctor_orders')} placeholder="VD: Tiếp tục kháng sinh, theo dõi thêm 24h…" className="min-h-[70px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          {formError && (
            <ErrorAlert icon={false} className="mt-2.5">{formError}</ErrorAlert>
          )}
          <Button
            type="submit"
            disabled={saving}
            size="cta" className="mt-3"
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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<NursingLogFormValues>({
    resolver: zodResolver(nursingLogSchema),
    defaultValues: { progress_note_id: '', action: '', notes: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await addNursingLog(admissionId, {
        progress_note_id: values.progress_note_id ? Number(values.progress_note_id) : undefined,
        action: values.action,
        notes: values.notes,
      });
      reset({ progress_note_id: '', action: '', notes: '' });
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
        <form onSubmit={handleFormSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Y lệnh liên quan</label>
          <Controller
            control={control}
            name="progress_note_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                  <SelectValue placeholder="-- Không gắn y lệnh --" />
                </SelectTrigger>
                <SelectContent emptyText="Chưa có y lệnh nào">
                  {progressNotes.map(n => <SelectItem key={n.ID} value={String(n.ID)}>{n.DoctorOrders || n.Content}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Hành động *</label>
          <Input placeholder="VD: Tiêm thuốc, truyền dịch, thay băng…" {...register('action')} aria-invalid={!!errors.action} className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          <FieldError message={errors.action?.message} />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Ghi chú</label>
          <Input {...register('notes')} placeholder="VD: Bệnh nhân hợp tác tốt, không có phản ứng bất thường…" className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />
          {formError && (
            <ErrorAlert icon={false} className="mt-2.5">{formError}</ErrorAlert>
          )}
          <Button
            type="submit"
            disabled={saving}
            size="cta" className="mt-3"
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
          className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
        >
          <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:plus'} className="text-xs" />
          {open ? 'Đóng' : actionLabel}
        </Button>
      )}
    </div>
  );
}
