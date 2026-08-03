import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FieldError from '@/components/FieldError';
import { createSurgeryOrder } from '@/api/surgery';
import { resolveError } from '@/utils/errorMessages';
import { surgeryStatusBadgeClass } from '@/utils/badgeStyles';
import { surgeryClassificationLabel, SURGERY_CLASSIFICATIONS } from '@/utils/labels';
import { SectionHeader, ErrorBox } from './shared';
import type { Diagnosis } from './types';

const STATUS_LABEL: Record<string, string> = {
  pending_scheduling: 'Chờ xếp lịch',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang mổ',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

interface SurgeryOrder {
  id: number | string;
  name: string;
  classification: string;
  price: number;
  pre_op_diagnosis: string;
  status: string;
  scheduled_at: string | null;
  operating_room_name: string;
}

function defaultDiagnosisText(diagnoses: Diagnosis[]): string {
  const primary = diagnoses.find(d => d.IsPrimary) ?? diagnoses[0];
  if (!primary) return '';
  return primary.ICD10Descriptor ? `${primary.ICD10Code} — ${primary.ICD10Descriptor}` : primary.ICD10Code;
}

export default function SurgeryOrderSection({
  encounterId,
  diagnoses,
  surgeryOrders,
  canCreate,
  onChanged,
}: {
  encounterId: string;
  diagnoses: Diagnosis[];
  surgeryOrders: SurgeryOrder[];
  canCreate: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [classification, setClassification] = useState('loai_1');
  const [preOpDiagnosis, setPreOpDiagnosis] = useState('');
  const [coveredByInsurance, setCoveredByInsurance] = useState(false);
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleOpen = () => {
    if (!open) {
      setName('');
      setClassification('loai_1');
      setPreOpDiagnosis(defaultDiagnosisText(diagnoses));
      setCoveredByInsurance(false);
      setNameError('');
      setFormError('');
    }
    setOpen(o => !o);
  };

  const handleSubmit = async () => {
    setNameError('');
    setFormError('');
    if (!name.trim()) {
      setNameError('Vui lòng nhập tên ca mổ.');
      return;
    }
    setSaving(true);
    try {
      await createSurgeryOrder(encounterId, {
        name: name.trim(),
        classification,
        pre_op_diagnosis: preOpDiagnosis.trim(),
        covered_by_insurance: coveredByInsurance,
      });
      setOpen(false);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
      <SectionHeader title="Chỉ định phẫu thuật" canAct={canCreate} open={open} onToggle={toggleOpen} actionLabel="Chỉ định phẫu thuật" />
      {open && canCreate && (
        <div className="mb-3.5 border-b border-[#f0f4f8] pb-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tên ca mổ *</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Cắt ruột thừa nội soi"
            className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
          />
          <FieldError message={nameError} />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Loại phẫu thuật *</label>
          <Select value={classification} onValueChange={setClassification}>
            <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SURGERY_CLASSIFICATIONS.map(c => (
                <SelectItem key={c} value={c}>{surgeryClassificationLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Chẩn đoán trước mổ</label>
          <Textarea
            value={preOpDiagnosis}
            onChange={e => setPreOpDiagnosis(e.target.value)}
            className="rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
          />
          <label className="mt-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#274760]">
            <input
              type="checkbox"
              checked={coveredByInsurance}
              onChange={e => setCoveredByInsurance(e.target.checked)}
              className="size-4"
            />
            Trong danh mục BHYT chi trả
          </label>
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="button" onClick={handleSubmit} disabled={saving} size="cta" className="mt-3">
            {saving ? 'Đang lưu…' : 'Chỉ định phẫu thuật'}
          </Button>
        </div>
      )}
      {surgeryOrders.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có chỉ định phẫu thuật nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {surgeryOrders.map(sg => (
            <li key={sg.id} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div>
                <div className="font-semibold text-[#274760]">{sg.name}</div>
                <div className="text-xs text-[#6c757d]">
                  {surgeryClassificationLabel(sg.classification)} · {sg.price.toLocaleString('vi-VN')} đ
                </div>
                {sg.pre_op_diagnosis && <div className="text-xs text-[#6c757d]">{sg.pre_op_diagnosis}</div>}
                {sg.scheduled_at && (
                  <div className="text-xs text-[#6c757d]">
                    {new Date(sg.scheduled_at).toLocaleString('vi-VN')} · {sg.operating_room_name}
                  </div>
                )}
              </div>
              <Badge className={surgeryStatusBadgeClass(sg.status)}>{STATUS_LABEL[sg.status] ?? sg.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
