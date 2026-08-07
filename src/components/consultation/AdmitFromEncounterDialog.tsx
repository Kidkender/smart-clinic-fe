import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { admitFromEncounter } from '@/api/admission';
import { listWards } from '@/api/ward';
import { listBeds } from '@/api/bed';
import { resolveError } from '@/utils/errorMessages';
import { admissionTypeLabel } from '@/utils/labels';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Ward {
  ID: number | string;
  Name: string;
}

interface Bed {
  ID: number | string;
  BedNumber: string;
}

interface AdmitFromEncounterDialogProps {
  encounterId: string;
  departmentId: number | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADMISSION_TYPES = ['bhyt', 'service', 'insurance_private'];

export default function AdmitFromEncounterDialog({
  encounterId, departmentId, open, onOpenChange,
}: AdmitFromEncounterDialogProps) {
  const navigate = useNavigate();
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [admissionType, setAdmissionType] = useState('bhyt');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWardId('');
    setBedId('');
    setBeds([]);
    setAdmissionType('bhyt');
    setError('');
    listWards(departmentId).then(r => setWards(r.data ?? [])).catch(() => setWards([]));
  }, [open, departmentId]);

  const handleWardChange = (value: string) => {
    setWardId(value);
    setBedId('');
    if (!value) {
      setBeds([]);
      return;
    }
    listBeds({ ward_id: value, status: 'available' })
      .then(r => setBeds(r.data ?? []))
      .catch(() => setBeds([]));
  };

  const handleSubmit = async () => {
    if (!wardId || !bedId) return;
    setSaving(true);
    setError('');
    try {
      const admission = await admitFromEncounter(encounterId, {
        ward_id: Number(wardId),
        bed_id: Number(bedId),
        admission_type: admissionType,
      });
      onOpenChange(false);
      navigate(`/admissions/${admission.data.ID}`);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[20px] p-8 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">Đề nghị nhập viện</DialogTitle>
        </DialogHeader>
        <p className="mt-1 mb-0 text-sm text-[#6c757d]">
          Lượt khám này sẽ được chuyển thành nội trú, giữ nguyên chẩn đoán, chỉ định và đơn thuốc đã ghi nhận.
        </p>

        <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Diện điều trị *</label>
        <Select value={admissionType} onValueChange={setAdmissionType}>
          <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADMISSION_TYPES.map(t => <SelectItem key={t} value={t}>{admissionTypeLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>

        <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khu điều trị *</label>
        <Select value={wardId} onValueChange={handleWardChange} disabled={wards.length === 0}>
          <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue placeholder="-- Chọn khu điều trị --" />
          </SelectTrigger>
          <SelectContent>
            {wards.map(w => <SelectItem key={w.ID} value={String(w.ID)}>{w.Name}</SelectItem>)}
          </SelectContent>
        </Select>

        <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giường trống *</label>
        <Select value={bedId} onValueChange={setBedId} disabled={!wardId || beds.length === 0}>
          <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue placeholder={wardId ? '-- Chọn giường --' : '-- Chọn khu điều trị trước --'} />
          </SelectTrigger>
          <SelectContent>
            {beds.map(b => <SelectItem key={b.ID} value={String(b.ID)}>Giường {b.BedNumber}</SelectItem>)}
          </SelectContent>
        </Select>

        {error && <ErrorAlert icon={false} className="mt-4">{error}</ErrorAlert>}

        <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
          >
            Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !wardId || !bedId} size="cta">
            {saving ? 'Đang lưu…' : 'Nhập viện'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
