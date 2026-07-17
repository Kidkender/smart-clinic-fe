import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getEncounterById, updateEncounterStatus } from '@/api/encounter';
import { recordVitalSign, listVitalSigns, addDiagnosis, listDiagnoses, updateClinicalNotes } from '@/api/consultation';
import { searchIcd10 } from '@/api/icd10';
import { createOrder, listOrdersByEncounter, updateOrderStatus } from '@/api/order';
import { searchDrugs, checkDrugInteractions } from '@/api/drug';
import { createPrescription, listPrescriptionsByEncounter, updatePrescriptionStatus } from '@/api/prescription';
import { useAuth } from '@/context/AuthContext';
import { resolveError } from '@/utils/errorMessages';
import {
  encounterStatusLabel,
  encounterTypeLabel,
  orderStatusLabel,
  orderTypeLabel,
  prescriptionStatusLabel,
  interactionSeverityLabel,
} from '@/utils/labels';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORDER_TYPES = ['lab', 'imaging', 'xray', 'ct', 'mri', 'ultrasound', 'endoscopy'];

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

interface PrescriptionItem {
  ID: number | string;
  DrugID: number | string;
  Drug?: { Name?: string };
  Quantity: number;
  Dosage?: string;
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

function includesRole(roles: string[], role: string | null): boolean {
  return role != null && roles.includes(role);
}

export default function Consultation() {
  const { id } = useParams<{ id: string }>();
  const encounterId = id ?? '';
  const { role } = useAuth();
  const canRecordVitals = includesRole(['admin', 'doctor', 'nurse'], role);
  const canDiagnose = includesRole(['admin', 'doctor'], role);
  const canOrder = includesRole(['admin', 'doctor'], role);
  const canUpdateOrderStatus = includesRole(['admin', 'lab_tech', 'nurse'], role);
  const canPrescribe = includesRole(['admin', 'doctor'], role);
  const canUpdatePrescriptionStatus = includesRole(['admin', 'pharmacist'], role);

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
      const [enc, v, d, o, p] = await Promise.all([
        getEncounterById(encounterId),
        listVitalSigns(encounterId),
        listDiagnoses(encounterId),
        listOrdersByEncounter(encounterId),
        listPrescriptionsByEncounter(encounterId),
      ]);
      setEncounter(enc.data);
      setVitals(v.data ?? []);
      setDiagnoses(d.data ?? []);
      setOrders(o.data ?? []);
      setPrescriptions(p.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleComplete = async () => {
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
      <Link
        to="/queue"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#307bc4] no-underline"
      >
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Hàng đợi khám
      </Link>

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
            {encounter.Status === 'in_progress' && (
              <Button
                onClick={handleComplete}
                className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                <Icon icon="fa6-solid:check" className="mr-1.5 text-[13px]" />Hoàn tất khám
              </Button>
            )}
          </div>
        </div>
        {encounter.Patient?.Allergies && (
          <div className="mt-3.5 rounded-[10px] bg-[#dc3545]/8 px-3.5 py-2.5 text-[13px] font-semibold text-[#dc3545]">
            <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Dị ứng: {encounter.Patient.Allergies}
          </div>
        )}
        {error && <div className="mt-3.5"><ErrorBox>{error}</ErrorBox></div>}
      </Card>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-5">
        <VitalsSection encounterId={encounterId} vitals={vitals} canRecord={canRecordVitals} onRecorded={loadAll} />
        <DiagnosesSection encounterId={encounterId} diagnoses={diagnoses} canAdd={canDiagnose} onAdded={loadAll} />
      </div>

      <ClinicalNotesSection encounterId={encounterId} notes={encounter.ClinicalNotes} canEdit={canDiagnose} onSaved={loadAll} />

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(460px,1fr))] gap-5">
        <OrdersSection encounterId={encounterId} orders={orders} canCreate={canOrder} canUpdateStatus={canUpdateOrderStatus} onChanged={loadAll} />
        <PrescriptionsSection encounterId={encounterId} prescriptions={prescriptions} canCreate={canPrescribe} canUpdateStatus={canUpdatePrescriptionStatus} onChanged={loadAll} />
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
  const [form, setForm] = useState(emptyVitalForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await recordVitalSign(encounterId, {
        temperature: Number(form.temperature) || 0,
        pulse: Number(form.pulse) || 0,
        blood_pressure_systolic: Number(form.systolic) || 0,
        blood_pressure_diastolic: Number(form.diastolic) || 0,
        respiratory_rate: Number(form.respiratoryRate) || 0,
        spo2: Number(form.spo2) || 0,
      });
      setForm(emptyVitalForm());
      setOpen(false);
      await onRecorded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

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
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <LabeledInput label="Nhiệt độ (°C)" value={form.temperature} onChange={v => setForm({ ...form, temperature: v })} type="number" step="0.1" />
            <LabeledInput label="Mạch (nhịp/p)" value={form.pulse} onChange={v => setForm({ ...form, pulse: v })} type="number" />
            <LabeledInput label="HA tâm thu" value={form.systolic} onChange={v => setForm({ ...form, systolic: v })} type="number" />
            <LabeledInput label="HA tâm trương" value={form.diastolic} onChange={v => setForm({ ...form, diastolic: v })} type="number" />
            <LabeledInput label="Nhịp thở" value={form.respiratoryRate} onChange={v => setForm({ ...form, respiratoryRate: v })} type="number" />
            <LabeledInput label="SpO2 (%)" value={form.spo2} onChange={v => setForm({ ...form, spo2: v })} type="number" />
          </div>
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
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
  const [form, setForm] = useState({ icd10_code: '', is_primary: false, notes: '' });
  const [icdQuery, setIcdQuery] = useState('');
  const [icdResults, setIcdResults] = useState<Icd10Code[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<Icd10Code | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleIcdSearch = async (value: string) => {
    setIcdQuery(value);
    setSelectedIcd(null);
    setForm(f => ({ ...f, icd10_code: '' }));
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
    setForm(f => ({ ...f, icd10_code: icd.Code }));
  };

  const resetForm = () => {
    setForm({ icd10_code: '', is_primary: false, notes: '' });
    setIcdQuery('');
    setIcdResults([]);
    setSelectedIcd(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await addDiagnosis(encounterId, form);
      resetForm();
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
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <div className="relative">
            <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Chẩn đoán (tra cứu ICD-10) *</label>
            <Input
              required
              value={icdQuery}
              onChange={e => handleIcdSearch(e.target.value)}
              placeholder="Nhập mã hoặc tên bệnh, ví dụ: J00, viêm họng…"
              className="h-auto rounded-[10px] border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
            />
            {icdResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-[180px] w-full overflow-y-auto rounded-[10px] border border-[#dde2e8] bg-white shadow-md">
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
          </div>
          <LabeledInput label="Ghi chú" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
          <label className="mt-2.5 flex items-center gap-2 text-sm text-[#274760]">
            <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} />
            Chẩn đoán chính
          </label>
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving || !form.icd10_code} className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
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
        className="min-h-[90px] w-full rounded-[10px] border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
      />
      {error && <div className="mt-2.5"><ErrorBox>{error}</ErrorBox></div>}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving || !dirty} className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
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

function OrdersSection({
  encounterId,
  orders,
  canCreate,
  canUpdateStatus,
  onChanged,
}: {
  encounterId: string;
  orders: Order[];
  canCreate: boolean;
  canUpdateStatus: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'lab', name: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createOrder(encounterId, form);
      setForm({ type: 'lab', name: '' });
      setOpen(false);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (order: Order, status: string) => {
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
                      className="h-auto min-w-[140px] flex-1 rounded-[10px] border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                  )}
                  {ORDER_STATUS_NEXT[o.Status].map(next => (
                    <Button
                      key={next}
                      variant="outline"
                      onClick={() => handleStatusChange(o, next)}
                      className="h-auto rounded-full border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
                    >
                      {orderStatusLabel(next)}
                    </Button>
                  ))}
                </div>
              )}
              {o.ResultSummary && <div className="mt-1.5 text-[13px] text-[#6c757d]">Kết quả: {o.ResultSummary}</div>}
            </li>
          ))}
        </ul>
      )}
      {open && canCreate && (
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Loại chỉ định *</label>
          <Select value={form.type} onValueChange={value => setForm({ ...form, type: value })}>
            <SelectTrigger className="h-auto w-full rounded-[10px] border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{orderTypeLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <LabeledInput label="Tên dịch vụ *" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
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
  onChanged,
}: {
  encounterId: string;
  prescriptions: Prescription[];
  canCreate: boolean;
  canUpdateStatus: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ drug_id: number | string; name: string; dosage: string; quantity: number | string; instructions: string }[]>([]);
  const [drugQuery, setDrugQuery] = useState('');
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [warnings, setWarnings] = useState<DrugWarning[]>([]);

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
    if (items.length === 0) {
      setFormError('Cần thêm ít nhất một loại thuốc.');
      return;
    }
    setSaving(true);
    try {
      const res = await createPrescription(encounterId, {
        items: items.map(it => ({ drug_id: it.drug_id, dosage: it.dosage, quantity: Number(it.quantity) || 1, instructions: it.instructions })),
      });
      if (res.data?.warnings?.length > 0) {
        setWarnings(res.data.warnings);
      } else {
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

  const handlePreCheck = async () => {
    if (items.length < 2) return;
    try {
      const res = await checkDrugInteractions(items.map(it => it.drug_id));
      setWarnings(res.data ?? []);
    } catch {
      // best-effort pre-check; server still validates on submit
    }
  };

  const handleStatusChange = async (prescription: Prescription, status: string) => {
    try {
      await updatePrescriptionStatus(encounterId, prescription.ID, status);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader title="Đơn thuốc" canAct={canCreate} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Kê đơn mới" />
      {prescriptions.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có đơn thuốc nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {prescriptions.map(p => (
            <li key={p.ID} className="flex flex-col items-stretch gap-1 border-b border-[#f0f4f8] py-2.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#274760]">Đơn #{p.ID} ({(p.Items ?? []).length} thuốc)</div>
                <SectionBadge>{prescriptionStatusLabel(p.Status)}</SectionBadge>
              </div>
              <ul className="m-0 mt-1.5 list-none p-0 text-[13px] text-[#6c757d]">
                {(p.Items ?? []).map(it => (
                  <li key={it.ID}>{it.Drug?.Name ?? `Thuốc #${it.DrugID}`} — SL {it.Quantity} {it.Dosage ? `· ${it.Dosage}` : ''}</li>
                ))}
              </ul>
              {canUpdateStatus && p.Status === 'active' && (
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(p, 'dispensed')}
                    className="h-auto rounded-full border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
                  >
                    Đã cấp phát
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(p, 'cancelled')}
                    className="h-auto rounded-full border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#dc3545]"
                  >
                    Hủy đơn
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && canCreate && (
        <form onSubmit={handleSubmit} className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tìm thuốc</label>
          <Input
            value={drugQuery}
            onChange={handleDrugSearch}
            placeholder="Nhập tên thuốc…"
            className="h-auto rounded-[10px] border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
          />
          {drugResults.length > 0 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-[10px] border border-[#dde2e8]">
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
                <div key={it.drug_id} className="mb-2 rounded-[10px] border border-[#f0f4f8] p-2.5">
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
                      className="h-auto rounded-[10px] border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="SL"
                      value={it.quantity}
                      onChange={e => updateItem(it.drug_id, 'quantity', e.target.value)}
                      className="h-auto rounded-[10px] border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                  </div>
                  <Input
                    placeholder="Hướng dẫn sử dụng"
                    value={it.instructions}
                    onChange={e => updateItem(it.drug_id, 'instructions', e.target.value)}
                    className="mt-2 h-auto w-full rounded-[10px] border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handlePreCheck}
                className="h-auto rounded-full border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
              >
                Kiểm tra tương tác thuốc
              </Button>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-3 rounded-[10px] border border-[#ffc107]/40 bg-[#ffc107]/12 px-3.5 py-3">
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

          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
            {saving ? 'Đang lưu…' : 'Tạo đơn thuốc'}
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
}: {
  title: string;
  canAct: boolean;
  open: boolean;
  onToggle: () => void;
  actionLabel: string;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <h2 className="m-0 text-[17px] font-bold text-[#274760]">{title}</h2>
      {canAct && (
        <Button
          variant="outline"
          onClick={onToggle}
          className="h-auto rounded-full border-[#dde2e8] px-4 py-2.25 text-[13px] font-medium text-[#274760]"
        >
          <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:plus'} className="mr-1.5 text-xs" />
          {open ? 'Đóng' : actionLabel}
        </Button>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">{label}</label>
      <Input
        required={required}
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-auto rounded-[10px] border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
      />
    </div>
  );
}

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className="shrink-0 rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4] hover:bg-[#307bc4]/10">
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

function emptyVitalForm() {
  return { temperature: '', pulse: '', systolic: '', diastolic: '', respiratoryRate: '', spo2: '' };
}
