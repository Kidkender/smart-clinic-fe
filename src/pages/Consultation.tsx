import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getEncounterById, updateEncounterStatus } from '@/api/encounter';
import { recordVitalSign, listVitalSigns, addDiagnosis, listDiagnoses, updateClinicalNotes } from '@/api/consultation';
import { searchIcd10 } from '@/api/icd10';
import { createOrder, listOrdersByEncounter, updateOrderStatus } from '@/api/order';
import { searchLabTests } from '@/api/lab';
import { searchImagingProcedures } from '@/api/imaging';
import { searchDrugs, checkDrugInteractions } from '@/api/drug';
import {
  createPrescription, listPrescriptionsByEncounter, updatePrescriptionStatus,
  getPrescriptionLabel, returnPrescriptionItem, resolvePrescriptionItemFlag,
} from '@/api/prescription';
import { printPrescriptionLabel } from '@/utils/printLabel';
import LabOrderPanel from '@/components/LabOrderPanel';
import ImagingOrderPanel from '@/components/ImagingOrderPanel';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { resolveError } from '@/utils/errorMessages';
import {
  encounterStatusLabel,
  encounterTypeLabel,
  orderStatusLabel,
  orderTypeLabel,
  prescriptionStatusLabel,
  interactionSeverityLabel,
  labResultFlagLabel,
  labResultFlagBadgeClass,
} from '@/utils/labels';
import { vitalSignSchema, diagnosisSchema, orderSchema, type VitalSignFormValues, type DiagnosisFormValues, type OrderFormValues } from '@/schemas/consultation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORDER_TYPES = ['lab', 'imaging', 'xray', 'ct', 'mri', 'ultrasound', 'endoscopy'];
const IMAGING_ORDER_TYPES = ['imaging', 'xray', 'ct', 'mri', 'ultrasound', 'endoscopy'];

interface Encounter {
  ID: number | string;
  PatientID: number | string;
  DepartmentID: number | string;
  Patient?: { Fullname?: string; MRN?: string; Allergies?: string };
  Department?: { Name?: string };
  Type: string;
  Status: string;
  QueueNumber: number;
  ClinicalNotes?: string;
}

interface VitalSign {
  ID: number | string;
  Temperature: number;
  Pulse: number;
  BloodPressureSystolic: number;
  BloodPressureDiastolic: number;
  SpO2: number;
  RespiratoryRate: number;
  RecordedAt?: string;
  CreatedAt?: string;
}

interface Icd10Code {
  Code: string;
  Descriptor: string;
}

interface Diagnosis {
  ID: number | string;
  ICD10Code: string;
  ICD10Descriptor?: string;
  IsPrimary?: boolean;
  Notes?: string;
}

interface Order {
  ID: number | string;
  Type: string;
  Name: string;
  Price?: number;
  Status: string;
  ResultSummary?: string;
}

interface PrescriptionItemFlag {
  ID: number;
  Reason: string;
  Status: string;
  CreatedAt: string;
}

interface PrescriptionItem {
  ID: number | string;
  DrugID: number | string;
  Drug?: { Name?: string };
  Quantity: number;
  Dosage?: string;
  Instructions?: string;
  Flags?: PrescriptionItemFlag[];
}

interface Prescription {
  ID: number | string;
  Items?: PrescriptionItem[];
  Status: string;
}

interface Drug {
  ID: number | string;
  Name: string;
  StockQuantity: number;
}

interface DrugWarning {
  severity: string;
  description?: string;
  drug_a_id: number | string;
  drug_b_id: number | string;
}

interface DuplicateDrugWarning {
  drug_id: number | string;
  drug_name: string;
  existing_prescription_id: number | string;
}

function includesRole(roles: string[], role: string | null): boolean {
  return role != null && roles.includes(role);
}

export default function Consultation() {
  const { id } = useParams<{ id: string }>();
  const encounterId = id ?? '';
  const navigate = useNavigate();
  const { role } = useAuth();
  const canRecordVitals = includesRole(['admin', 'doctor', 'nurse'], role);
  // Must match backend's clinicalRoles gate on PATCH /encounters/:id/status (routes/encounter.go)
  // and vitalsRoles gate on GET vitals/diagnoses (routes/consultation.go) — pharmacist can open an
  // encounter to dispense, but has no read access to vitals/diagnoses, so those must be skipped
  // entirely rather than fetched and 403ing the whole page load.
  const canCompleteEncounter = canRecordVitals;
  const canViewClinicalData = canRecordVitals;
  const canDiagnose = includesRole(['admin', 'doctor'], role);
  const canOrder = includesRole(['admin', 'doctor'], role);
  const canUpdateOrderStatus = includesRole(['admin', 'lab_tech', 'nurse'], role);
  const canPrescribe = includesRole(['admin', 'doctor'], role);
  const canUpdatePrescriptionStatus = includesRole(['admin', 'pharmacist'], role);

  const [confirm, ConfirmDialog] = useConfirm();

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [enc, o, p] = await Promise.all([
        getEncounterById(encounterId),
        listOrdersByEncounter(encounterId),
        listPrescriptionsByEncounter(encounterId),
      ]);
      setEncounter(enc.data);
      setOrders(o.data ?? []);
      setPrescriptions(p.data ?? []);

      if (canViewClinicalData) {
        const [v, d] = await Promise.all([listVitalSigns(encounterId), listDiagnoses(encounterId)]);
        setVitals(v.data ?? []);
        setDiagnoses(d.data ?? []);
      }
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterId, canViewClinicalData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleComplete = async () => {
    const ok = await confirm(
      'Hoàn tất lượt khám này? Sau khi hoàn tất, dược sĩ sẽ được phép cấp phát các đơn thuốc đang hiệu lực của lượt khám. Hãy chắc chắn đã ghi nhận đầy đủ sinh hiệu, chẩn đoán, chỉ định và đơn thuốc trước khi tiếp tục.',
      { title: 'Hoàn tất khám', danger: false, confirmLabel: 'Hoàn tất' },
    );
    if (!ok) return;
    try {
      await updateEncounterStatus(encounterId, 'completed');
      await loadAll();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }
  if (error && !encounter) {
    return <ErrorBox>{error}</ErrorBox>;
  }
  if (!encounter) return null;

  return (
    <>
      {ConfirmDialog}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm font-semibold text-[#307bc4]"
      >
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Quay lại
      </button>

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-[22px] font-bold text-[#274760]">
              {encounter.Patient?.Fullname ?? `Bệnh nhân #${encounter.PatientID}`}
            </h1>
            <p className="mt-1 mb-0 text-sm text-[#6c757d]">
              MRN: {encounter.Patient?.MRN ?? '—'} · {encounter.Department?.Name ?? `Khoa #${encounter.DepartmentID}`} · {encounterTypeLabel(encounter.Type)} · STT {encounter.QueueNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SectionBadge>{encounterStatusLabel(encounter.Status)}</SectionBadge>
            {canCompleteEncounter && encounter.Status === 'in_progress' && (
              <Button
                onClick={handleComplete}
                className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                <Icon icon="fa6-solid:check" className="mr-1.5 text-[13px]" />Hoàn tất khám
              </Button>
            )}
          </div>
        </div>
        {encounter.Patient?.Allergies && (
          <div className="mt-3.5 rounded-lg bg-[#dc3545]/8 px-3.5 py-2.5 text-[13px] font-semibold text-[#dc3545]">
            <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Dị ứng: {encounter.Patient.Allergies}
          </div>
        )}
        {error && <div className="mt-3.5"><ErrorBox>{error}</ErrorBox></div>}
      </Card>

      {canViewClinicalData && (
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-5">
          <VitalsSection encounterId={encounterId} vitals={vitals} canRecord={canRecordVitals} onRecorded={loadAll} />
          <DiagnosesSection encounterId={encounterId} diagnoses={diagnoses} canAdd={canDiagnose} onAdded={loadAll} />
        </div>
      )}

      <ClinicalNotesSection encounterId={encounterId} notes={encounter.ClinicalNotes} canEdit={canDiagnose} onSaved={loadAll} />

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(460px,1fr))] gap-5">
        <OrdersSection encounterId={encounterId} orders={orders} canCreate={canOrder} canUpdateStatus={canUpdateOrderStatus} role={role} onChanged={loadAll} />
        <PrescriptionsSection
          encounterId={encounterId}
          prescriptions={prescriptions}
          canCreate={canPrescribe}
          canUpdateStatus={canUpdatePrescriptionStatus}
          encounterCompleted={encounter?.Status === 'completed'}
          onChanged={loadAll}
        />
      </div>
    </>
  );
}

function VitalsSection({
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

function DiagnosesSection({
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

function ClinicalNotesSection({
  encounterId,
  notes,
  canEdit,
  onSaved,
}: {
  encounterId: string;
  notes?: string;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(notes ?? '');
    setDirty(false);
  }, [notes]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await updateClinicalNotes(encounterId, value);
      setDirty(false);
      await onSaved();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
      <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Ghi chú lâm sàng</h2>
      <Textarea
        value={value}
        onChange={e => { setValue(e.target.value); setDirty(true); }}
        disabled={!canEdit}
        placeholder={canEdit ? 'Triệu chứng, diễn biến, nhận định lâm sàng…' : 'Chưa có ghi chú.'}
        className="min-h-[90px] w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
      />
      {error && <div className="mt-2.5"><ErrorBox>{error}</ErrorBox></div>}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving || !dirty} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
          {saving ? 'Đang lưu…' : 'Lưu ghi chú'}
        </Button>
      )}
    </Card>
  );
}

const ORDER_STATUS_NEXT: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

interface LabTestOption {
  ID: number | string;
  Name: string;
}

interface ImagingProcedureOption {
  ID: number | string;
  Name: string;
}

interface ParsedLabResultToken {
  name: string;
  value: string;
  unit: string;
  flag: string;
}

// Mirrors the exact "Name: Value Unit [flag]; ..." shape buildLabResultSummary
// produces server-side (internal/service/lab.go) so completed lab orders can
// render each result as a colored flag chip instead of one long plain-text
// line. Returns null on any mismatch so the caller can fall back to plain text
// rather than show a mangled parse.
function parseLabResultSummary(summary: string): ParsedLabResultToken[] | null {
  const tokens: ParsedLabResultToken[] = [];
  for (const part of summary.split('; ')) {
    const match = /^(.+): (\S+) (\S+) \[(\w+)\]$/.exec(part);
    if (!match) return null;
    const [, name, value, unit, flag] = match;
    tokens.push({ name, value, unit, flag });
  }
  return tokens;
}

function OrdersSection({
  encounterId,
  orders,
  canCreate,
  canUpdateStatus,
  role,
  onChanged,
}: {
  encounterId: string;
  orders: Order[];
  canCreate: boolean;
  canUpdateStatus: boolean;
  role: string | null;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  const [labTestOptions, setLabTestOptions] = useState<LabTestOption[]>([]);
  const [imagingProcedureOptions, setImagingProcedureOptions] = useState<ImagingProcedureOption[]>([]);
  const {
    register, control, watch, setValue, handleSubmit, reset, formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { type: 'lab', name: '' },
  });
  const orderType = watch('type');
  const [confirm, ConfirmDialog] = useConfirm();

  useEffect(() => {
    if (!open || orderType !== 'lab') return;
    searchLabTests({ page: 1, limit: 200 })
      .then(result => setLabTestOptions(result.data ?? []))
      .catch(() => setLabTestOptions([]));
  }, [open, orderType]);

  useEffect(() => {
    if (!open || !IMAGING_ORDER_TYPES.includes(orderType)) return;
    searchImagingProcedures({ modality: orderType === 'imaging' ? undefined : orderType, page: 1, limit: 200 })
      .then(result => setImagingProcedureOptions(result.data ?? []))
      .catch(() => setImagingProcedureOptions([]));
  }, [open, orderType]);

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await createOrder(encounterId, values);
      reset({ type: 'lab', name: '' });
      setOpen(false);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleStatusChange = async (order: Order, status: string) => {
    if (status === 'cancelled') {
      const ok = await confirm(
        `Hủy chỉ định "${order.Name}"? Hành động này không thể hoàn tác.`,
        { title: 'Hủy chỉ định', confirmLabel: 'Hủy chỉ định' },
      );
      if (!ok) return;
    }
    try {
      await updateOrderStatus(encounterId, order.ID, {
        status,
        result_summary: status === 'completed' ? (resultDrafts[order.ID] ?? '') : undefined,
      });
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      {ConfirmDialog}
      <SectionHeader title="Chỉ định CLS" canAct={canCreate} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Thêm chỉ định" />
      {orders.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có chỉ định nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {orders.map(o => (
            <li key={o.ID} className="flex flex-col items-stretch gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">{o.Name} ({orderTypeLabel(o.Type)})</div>
                  <div className="text-xs text-[#6c757d]">{o.Price?.toLocaleString('vi-VN')} đ</div>
                </div>
                <SectionBadge>{orderStatusLabel(o.Status)}</SectionBadge>
              </div>
              {canUpdateStatus && ORDER_STATUS_NEXT[o.Status] && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ORDER_STATUS_NEXT[o.Status].includes('completed') && (
                    <Input
                      placeholder="Kết quả…"
                      value={resultDrafts[o.ID] ?? ''}
                      onChange={e => setResultDrafts({ ...resultDrafts, [o.ID]: e.target.value })}
                      className="h-auto min-w-[140px] flex-1 rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                  )}
                  {ORDER_STATUS_NEXT[o.Status].map(next => (
                    <Button
                      key={next}
                      variant="outline"
                      onClick={() => handleStatusChange(o, next)}
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
                    >
                      {orderStatusLabel(next)}
                    </Button>
                  ))}
                </div>
              )}
              {(() => {
                if (!o.ResultSummary) return null;
                const tokens = o.Type === 'lab' ? parseLabResultSummary(o.ResultSummary) : null;
                if (!tokens) {
                  return <div className="mt-1.5 text-[13px] text-[#6c757d]">Kết quả: {o.ResultSummary}</div>;
                }
                return (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] text-[#6c757d]">Kết quả:</span>
                    {tokens.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e8edf2] bg-white px-2.5 py-1 text-xs text-[#274760]"
                      >
                        {r.name}: {r.value} {r.unit}
                        <Badge className={labResultFlagBadgeClass(r.flag)}>{labResultFlagLabel(r.flag)}</Badge>
                      </span>
                    ))}
                  </div>
                );
              })()}
              {o.Type === 'lab' && <LabOrderPanel orderId={o.ID} role={role} onOrderChanged={onChanged} />}
              {o.Type !== 'lab' && <ImagingOrderPanel orderId={o.ID} role={role} onOrderChanged={onChanged} />}
            </li>
          ))}
        </ul>
      )}
      {open && canCreate && (
        <form onSubmit={handleFormSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Loại chỉ định *</label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={value => {
                  field.onChange(value);
                  setValue('name', '');
                }}
              >
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{orderTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tên dịch vụ *</label>
          {orderType === 'lab' ? (
            <>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={labTestOptions.length === 0}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                      <SelectValue placeholder={labTestOptions.length === 0 ? 'Chưa có xét nghiệm nào trong danh mục' : 'Chọn xét nghiệm…'} />
                    </SelectTrigger>
                    <SelectContent>
                      {labTestOptions.map(t => (
                        <SelectItem key={t.ID} value={t.Name}>{t.Name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {labTestOptions.length === 0 && (
                <p className="mt-1.5 text-[13px] text-[#dc3545]">
                  Danh mục xét nghiệm đang trống. Vào "Danh mục xét nghiệm" để thêm trước khi chỉ định.
                </p>
              )}
            </>
          ) : IMAGING_ORDER_TYPES.includes(orderType) ? (
            <>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={imagingProcedureOptions.length === 0}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                      <SelectValue placeholder={imagingProcedureOptions.length === 0 ? 'Chưa có dịch vụ nào trong danh mục' : 'Chọn dịch vụ chẩn đoán hình ảnh…'} />
                    </SelectTrigger>
                    <SelectContent>
                      {imagingProcedureOptions.map(p => (
                        <SelectItem key={p.ID} value={p.Name}>{p.Name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {imagingProcedureOptions.length === 0 && (
                <p className="mt-1.5 text-[13px] text-[#dc3545]">
                  Danh mục chẩn đoán hình ảnh đang trống cho loại kỹ thuật này. Vào "Danh mục CĐHA" để thêm trước khi chỉ định.
                </p>
              )}
            </>
          ) : (
            <Input
              {...register('name')}
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
            />
          )}
          <FieldError message={errors.name?.message} />
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
            {saving ? 'Đang lưu…' : 'Tạo chỉ định'}
          </Button>
        </form>
      )}
    </Card>
  );
}

function PrescriptionsSection({
  encounterId,
  prescriptions,
  canCreate,
  canUpdateStatus,
  encounterCompleted,
  onChanged,
}: {
  encounterId: string;
  prescriptions: Prescription[];
  canCreate: boolean;
  canUpdateStatus: boolean;
  encounterCompleted: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ drug_id: number | string; name: string; dosage: string; quantity: number | string; instructions: string }[]>([]);
  const [drugQuery, setDrugQuery] = useState('');
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [warnings, setWarnings] = useState<DrugWarning[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateDrugWarning[]>([]);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<number | string | null>(null);

  const [returningItemId, setReturningItemId] = useState<number | string | null>(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState('');
  const [returning, setReturning] = useState(false);

  const [cancelingPrescriptionId, setCancelingPrescriptionId] = useState<number | string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [resolvingFlagId, setResolvingFlagId] = useState<number | null>(null);
  const [flagResolveError, setFlagResolveError] = useState('');

  const handleResolveFlag = async (prescription: Prescription, item: PrescriptionItem, flag: PrescriptionItemFlag) => {
    setResolvingFlagId(flag.ID);
    setFlagResolveError('');
    try {
      await resolvePrescriptionItemFlag(encounterId, prescription.ID, item.ID, flag.ID);
      await onChanged();
    } catch (err) {
      setFlagResolveError(resolveError(err));
    } finally {
      setResolvingFlagId(null);
    }
  };

  const handleDrugSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDrugQuery(value);
    if (value.trim().length < 2) {
      setDrugResults([]);
      return;
    }
    try {
      const result = await searchDrugs({ name: value.trim(), page: 1, limit: 10 });
      setDrugResults(result.data ?? []);
    } catch {
      setDrugResults([]);
    }
  };

  const addItem = (drug: Drug) => {
    if (items.some(it => it.drug_id === drug.ID)) return;
    setItems([...items, { drug_id: drug.ID, name: drug.Name, dosage: '', quantity: 1, instructions: '' }]);
    setDrugQuery('');
    setDrugResults([]);
  };

  const removeItem = (drugId: number | string) => setItems(items.filter(it => it.drug_id !== drugId));

  const updateItem = (drugId: number | string, field: 'dosage' | 'quantity' | 'instructions', value: string) => {
    setItems(items.map(it => (it.drug_id === drugId ? { ...it, [field]: value } : it)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setWarnings([]);
    setDuplicateWarnings([]);
    if (items.length === 0) {
      setFormError('Cần thêm ít nhất một loại thuốc.');
      return;
    }
    setSaving(true);
    try {
      if (editingPrescriptionId != null) {
        await updatePrescriptionStatus(encounterId, editingPrescriptionId, 'cancelled', 'Đã thay thế bằng đơn thuốc mới (sửa đơn).');
        // Clear right away: if the create call below fails, a retry must not
        // try to cancel an already-cancelled prescription again.
        setEditingPrescriptionId(null);
      }
      const res = await createPrescription(encounterId, {
        items: items.map(it => ({ drug_id: it.drug_id, dosage: it.dosage, quantity: Number(it.quantity) || 1, instructions: it.instructions })),
      });
      const hasWarnings = res.data?.warnings?.length > 0;
      const hasDuplicates = res.data?.duplicate_warnings?.length > 0;
      if (hasWarnings) setWarnings(res.data.warnings);
      if (hasDuplicates) setDuplicateWarnings(res.data.duplicate_warnings);
      if (!hasWarnings && !hasDuplicates) {
        setItems([]);
        setOpen(false);
      }
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setFormError('');
    setWarnings([]);
    setDuplicateWarnings([]);
    setItems(
      (prescription.Items ?? []).map(it => ({
        drug_id: it.DrugID,
        name: it.Drug?.Name ?? `Thuốc #${it.DrugID}`,
        dosage: it.Dosage ?? '',
        quantity: it.Quantity,
        instructions: it.Instructions ?? '',
      })),
    );
    setEditingPrescriptionId(prescription.ID);
    setOpen(true);
  };

  const handlePreCheck = async () => {
    if (items.length < 2) return;
    try {
      const res = await checkDrugInteractions(items.map(it => it.drug_id));
      setWarnings(res.data ?? []);
    } catch {
      // best-effort pre-check; server still validates on submit
    }
  };

  const handleDispense = async (prescription: Prescription) => {
    try {
      await updatePrescriptionStatus(encounterId, prescription.ID, 'dispensed');
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  const openCancel = (prescription: Prescription) => {
    setCancelingPrescriptionId(prescription.ID);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelSubmit = async (prescription: Prescription, e: FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await updatePrescriptionStatus(encounterId, prescription.ID, 'cancelled', cancelReason.trim());
      setCancelingPrescriptionId(null);
      await onChanged();
    } catch (err) {
      setCancelError(resolveError(err));
    } finally {
      setCancelling(false);
    }
  };

  const printableCount = prescriptions.filter(p => p.Status !== 'cancelled' && (p.Items ?? []).length > 0).length;

  const handlePrintLabel = async () => {
    setFormError('');
    try {
      const res = await getPrescriptionLabel(encounterId);
      printPrescriptionLabel(res.data);
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  const openReturn = (item: PrescriptionItem) => {
    setReturningItemId(item.ID);
    setReturnQty(String(item.Quantity));
    setReturnReason('');
    setReturnError('');
  };

  const handleReturnSubmit = async (prescription: Prescription, item: PrescriptionItem, e: FormEvent) => {
    e.preventDefault();
    const qty = Number(returnQty);
    if (!qty || qty < 1 || qty > item.Quantity) {
      setReturnError('Số lượng không hợp lệ.');
      return;
    }
    setReturning(true);
    setReturnError('');
    try {
      await returnPrescriptionItem(encounterId, prescription.ID, item.ID, { quantity: qty, reason: returnReason });
      setReturningItemId(null);
      await onChanged();
    } catch (err) {
      setReturnError(resolveError(err));
    } finally {
      setReturning(false);
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader
        title="Đơn thuốc"
        canAct={canCreate}
        open={open}
        onToggle={() => {
          setOpen(o => !o);
          setEditingPrescriptionId(null);
          setItems([]);
          setWarnings([]);
          setDuplicateWarnings([]);
          setFormError('');
        }}
        actionLabel="Kê đơn mới"
        extra={canUpdateStatus && (
          <Button
            type="button"
            variant="outline"
            disabled={printableCount === 0}
            onClick={handlePrintLabel}
            title={printableCount === 0 ? 'Chưa có đơn thuốc nào để in' : 'In toàn bộ đơn thuốc của lượt khám này'}
            className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-4 py-2.25 text-[13px] font-semibold text-[#307bc4] disabled:opacity-40"
          >
            <Icon icon="fa6-solid:print" className="mr-1.5 text-xs" />In đơn thuốc
          </Button>
        )}
      />
      {formError && !open && <div className="mb-3"><ErrorBox>{formError}</ErrorBox></div>}
      {flagResolveError && <div className="mb-3"><ErrorBox>{flagResolveError}</ErrorBox></div>}
      {prescriptions.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có đơn thuốc nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {prescriptions.map(p => (
            <li key={p.ID} className="flex flex-col items-stretch gap-1 border-b border-[#f0f4f8] py-2.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#274760]">Đơn #{p.ID} ({(p.Items ?? []).length} thuốc)</div>
                <SectionBadge tone={p.Status === 'cancelled' ? 'danger' : 'default'}>{prescriptionStatusLabel(p.Status)}</SectionBadge>
              </div>
              <ul className="m-0 mt-1.5 list-none p-0 text-[13px] text-[#6c757d]">
                {(p.Items ?? []).map(it => (
                  <li key={it.ID} className="py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span>{it.Drug?.Name ?? `Thuốc #${it.DrugID}`} — SL {it.Quantity} {it.Dosage ? `· ${it.Dosage}` : ''}</span>
                      {canUpdateStatus && p.Status === 'dispensed' && (
                        <button
                          type="button"
                          onClick={() => openReturn(it)}
                          className="shrink-0 cursor-pointer border-none bg-transparent text-xs font-semibold text-[#307bc4]"
                        >
                          Hoàn trả
                        </button>
                      )}
                    </div>
                    {(it.Flags ?? []).filter(f => f.Status === 'pending').map(flag => (
                      <div
                        key={flag.ID}
                        className="mt-1.5 mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e0a800]/30 bg-[#e0a800]/10 px-2.5 py-1.5 text-xs text-[#8a6d00]"
                      >
                        <span>
                          <Icon icon="fa6-solid:bullhorn" className="mr-1.5" />
                          Dược sĩ báo: {flag.Reason}
                        </span>
                        {canCreate && (
                          <button
                            type="button"
                            disabled={resolvingFlagId === flag.ID}
                            onClick={() => handleResolveFlag(p, it, flag)}
                            className="shrink-0 cursor-pointer rounded-full border-none bg-[#e0a800]/20 px-2.5 py-1 text-[11px] font-semibold text-[#8a6d00]"
                          >
                            {resolvingFlagId === flag.ID ? 'Đang xử lý…' : 'Đã xử lý'}
                          </button>
                        )}
                      </div>
                    ))}
                    {returningItemId === it.ID && (
                      <form
                        onSubmit={e => handleReturnSubmit(p, it, e)}
                        noValidate
                        className="mt-1.5 mb-2 flex items-start gap-2 rounded-lg border border-[#f0f4f8] p-2"
                      >
                        <Input
                          type="number"
                          min={1}
                          max={it.Quantity}
                          value={returnQty}
                          onChange={e => setReturnQty(e.target.value)}
                          className="h-auto w-20 rounded-lg border-[#dde2e8] px-2 py-1.5 text-xs text-[#274760]"
                        />
                        <Input
                          placeholder="Lý do hoàn trả"
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value)}
                          className="h-auto flex-1 rounded-lg border-[#dde2e8] px-2 py-1.5 text-xs text-[#274760]"
                        />
                        <Button
                          type="submit"
                          disabled={returning}
                          className="h-auto shrink-0 rounded-lg bg-[#307bc4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                        >
                          Lưu
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setReturningItemId(null)}
                          className="h-auto shrink-0 rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
                        >
                          Hủy
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {returningItemId != null && (p.Items ?? []).some(it => it.ID === returningItemId) && returnError && (
                <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-3 py-2 text-xs text-[#dc3545]">
                  {returnError}
                </div>
              )}
              {(canUpdateStatus || canCreate) && p.Status === 'active' && (
                <div className="mt-2 flex flex-col items-start gap-1.5">
                  <div className="flex gap-2">
                    {canCreate && (
                      <Button
                        variant="outline"
                        onClick={() => handleEditPrescription(p)}
                        title="Hủy đơn này và mở lại danh sách thuốc để chỉnh sửa"
                        className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#307bc4]"
                      >
                        Sửa đơn
                      </Button>
                    )}
                    {canUpdateStatus && (
                      <Button
                        variant="outline"
                        disabled={!encounterCompleted}
                        onClick={() => handleDispense(p)}
                        title={encounterCompleted ? undefined : 'Bác sĩ chưa hoàn tất lượt khám này'}
                        className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760] disabled:opacity-40"
                      >
                        Đã cấp phát
                      </Button>
                    )}
                    {canUpdateStatus && (
                      <Button
                        variant="outline"
                        onClick={() => openCancel(p)}
                        className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#dc3545]"
                      >
                        Hủy đơn
                      </Button>
                    )}
                  </div>
                  {canUpdateStatus && !encounterCompleted && (
                    <span className="text-[11px] text-[#6c757d]">Chờ bác sĩ hoàn tất khám trước khi cấp phát.</span>
                  )}
                  {cancelingPrescriptionId === p.ID && (
                    <form
                      onSubmit={e => handleCancelSubmit(p, e)}
                      noValidate
                      className="mt-1 w-full rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/5 p-2.5"
                    >
                      <label className="mb-1 block text-[11px] font-semibold text-[#dc3545]">
                        Lý do hủy đơn thuốc *
                      </label>
                      <Input
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="VD: tương tác thuốc, sai liều, bệnh nhân không lấy thuốc…"
                        className="h-auto rounded-lg border-[#dde2e8] px-2.5 py-1.5 text-xs text-[#274760]"
                      />
                      {cancelError && <p className="mt-1 text-[11px] text-[#dc3545]">{cancelError}</p>}
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="submit"
                          disabled={cancelling}
                          className="h-auto rounded-lg bg-[#dc3545] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#dc3545]/90"
                        >
                          {cancelling ? 'Đang hủy…' : 'Xác nhận hủy'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCancelingPrescriptionId(null)}
                          className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
                        >
                          Đóng
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && canCreate && (
        <form onSubmit={handleSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tìm thuốc</label>
          <Input
            value={drugQuery}
            onChange={handleDrugSearch}
            placeholder="Nhập tên thuốc…"
            className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
          />
          {drugResults.length > 0 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-[#dde2e8]">
              {drugResults.map(d => (
                <div key={d.ID} onClick={() => addItem(d)} className="cursor-pointer px-3.5 py-2.5 text-sm text-[#274760]">
                  {d.Name} <span className="text-[#6c757d]">· còn {d.StockQuantity}</span>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-3">
              {items.map(it => (
                <div key={it.drug_id} className="mb-2 rounded-lg border border-[#f0f4f8] p-2.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-[#274760]">{it.name}</strong>
                    <button
                      type="button"
                      onClick={() => removeItem(it.drug_id)}
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:xmark" className="text-xs" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_80px] gap-2">
                    <Input
                      placeholder="Liều dùng"
                      value={it.dosage}
                      onChange={e => updateItem(it.drug_id, 'dosage', e.target.value)}
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="SL"
                      value={it.quantity}
                      onChange={e => updateItem(it.drug_id, 'quantity', e.target.value)}
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                  </div>
                  <Input
                    placeholder="Hướng dẫn sử dụng"
                    value={it.instructions}
                    onChange={e => updateItem(it.drug_id, 'instructions', e.target.value)}
                    className="mt-2 h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handlePreCheck}
                className="h-auto rounded-xl border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
              >
                Kiểm tra tương tác thuốc
              </Button>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-[#ffc107]/40 bg-[#ffc107]/12 px-3.5 py-3">
              <div className="mb-1.5 text-[13px] font-bold text-[#8a6100]">
                <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Cảnh báo tương tác thuốc
              </div>
              {warnings.map((w, i) => (
                <div key={i} className="text-[13px] text-[#8a6100]">
                  [{interactionSeverityLabel(w.severity)}] {w.description || `Thuốc #${w.drug_a_id} và #${w.drug_b_id} có tương tác.`}
                </div>
              ))}
              <div className="mt-1.5 text-xs text-[#8a6100]">Cảnh báo không chặn tạo đơn — bác sĩ tự quyết định.</div>
            </div>
          )}

          {duplicateWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-[#ffc107]/40 bg-[#ffc107]/12 px-3.5 py-3">
              <div className="mb-1.5 text-[13px] font-bold text-[#8a6100]">
                <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Trùng thuốc với đơn khác đang hiệu lực
              </div>
              {duplicateWarnings.map((w, i) => (
                <div key={i} className="text-[13px] text-[#8a6100]">
                  {w.drug_name} đã có trong đơn #{w.existing_prescription_id} (đang hiệu lực) của cùng lượt khám này.
                </div>
              ))}
              <div className="mt-1.5 text-xs text-[#8a6100]">
                Đơn thuốc đã được tạo. Nếu đây là toa trùng, hãy hủy đơn thừa để tránh cấp phát thuốc 2 lần.
              </div>
            </div>
          )}

          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
            {saving ? 'Đang lưu…' : editingPrescriptionId != null ? 'Lưu đơn đã sửa' : 'Tạo đơn thuốc'}
          </Button>
        </form>
      )}
    </Card>
  );
}

function SectionHeader({
  title,
  canAct,
  open,
  onToggle,
  actionLabel,
  extra,
}: {
  title: string;
  canAct: boolean;
  open: boolean;
  onToggle: () => void;
  actionLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-2">
      <h2 className="m-0 text-[17px] font-bold text-[#274760]">{title}</h2>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        {canAct && (
          <Button
            variant="outline"
            onClick={onToggle}
            className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-4 py-2.25 text-[13px] font-medium text-[#274760]"
          >
            <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:plus'} className="mr-1.5 text-xs" />
            {open ? 'Đóng' : actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionBadge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'danger' }) {
  const toneClass = tone === 'danger'
    ? 'bg-[#dc3545]/10 text-[#dc3545] hover:bg-[#dc3545]/10'
    : 'bg-[#307bc4]/10 text-[#307bc4] hover:bg-[#307bc4]/10';
  return (
    <Badge className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </Badge>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
      <Icon icon="fa6-solid:circle-exclamation" />
      {children}
    </div>
  );
}

function emptyVitalForm(): VitalSignFormValues {
  return { temperature: 0, pulse: 0, systolic: 0, diastolic: 0, respiratoryRate: 0, spo2: 0 };
}
