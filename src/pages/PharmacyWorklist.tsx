import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  listPrescriptionWorklist, updatePrescriptionStatus, getPrescriptionLabel,
} from '@/api/prescription';
import { printPrescriptionLabel } from '@/utils/printLabel';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorklistDrugItem {
  drug_name: string;
  strength?: string;
  dosage?: string;
  quantity: number;
  instructions?: string;
}

interface WorklistPrescription {
  prescription_id: number | string;
  encounter_id: number | string;
  patient_name: string;
  patient_mrn: string;
  created_at: string;
  items: WorklistDrugItem[];
}

export default function PharmacyWorklist() {
  const [items, setItems] = useState<WorklistPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<number | string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const fetchWorklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listPrescriptionWorklist();
      setItems(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorklist();
  }, [fetchWorklist]);

  const handleDispense = async (p: WorklistPrescription) => {
    setActingId(p.prescription_id);
    setError('');
    try {
      await updatePrescriptionStatus(p.encounter_id, p.prescription_id, 'dispensed');
      await fetchWorklist();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setActingId(null);
    }
  };

  const openCancel = (p: WorklistPrescription) => {
    setCancelingId(p.prescription_id);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelSubmit = async (p: WorklistPrescription, e: FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    setActingId(p.prescription_id);
    setCancelError('');
    try {
      await updatePrescriptionStatus(p.encounter_id, p.prescription_id, 'cancelled', cancelReason.trim());
      setCancelingId(null);
      await fetchWorklist();
    } catch (err) {
      setCancelError(resolveError(err));
    } finally {
      setActingId(null);
    }
  };

  const handlePrint = async (p: WorklistPrescription) => {
    setError('');
    try {
      const res = await getPrescriptionLabel(p.encounter_id);
      printPrescriptionLabel(res.data);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Cấp thuốc ngoại trú</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Toàn bộ đơn thuốc đang chờ cấp phát — chỉ hiện đơn của các lượt khám bác sĩ đã hoàn tất
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-15 text-center text-[#6c757d]">
          <Icon icon="fa6-solid:prescription-bottle-medical" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
          <h3 className="mb-2 text-[#274760]">Không có đơn thuốc nào đang chờ cấp phát</h3>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map(p => (
            <Card key={p.prescription_id} className="rounded-2xl border-[#e8edf2] p-6">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">
                    {p.patient_name} <span className="text-xs font-normal text-[#6c757d]">({p.patient_mrn})</span>
                  </div>
                  <div className="text-sm text-[#6c757d]">
                    Đơn #{p.prescription_id} · {new Date(p.created_at).toLocaleString('vi-VN')} · {p.items.length} thuốc
                  </div>
                </div>
                <Link
                  to={`/encounters/${p.encounter_id}`}
                  className="text-[13px] font-medium text-[#307bc4] no-underline hover:underline"
                >
                  Xem hồ sơ
                </Link>
              </div>

              <ul className="m-0 my-3 list-none p-0 text-[13px] text-[#6c757d]">
                {p.items.map((it, i) => (
                  <li key={i} className="border-b border-[#f0f4f8] py-1.5 last:border-b-0">
                    <span className="font-semibold text-[#274760]">{it.drug_name}</span>
                    {it.strength ? ` ${it.strength}` : ''} — SL {it.quantity}
                    {it.dosage ? ` · ${it.dosage}` : ''}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={actingId === p.prescription_id}
                  onClick={() => handleDispense(p)}
                  className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#274760]"
                >
                  <Icon icon="fa6-solid:check" className="mr-1.5 text-[11px]" />Cấp phát
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrint(p)}
                  className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#307bc4]"
                >
                  <Icon icon="fa6-solid:print" className="mr-1.5 text-[11px]" />In đơn thuốc
                </Button>
                <Button
                  variant="outline"
                  disabled={actingId === p.prescription_id}
                  onClick={() => openCancel(p)}
                  className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#dc3545]"
                >
                  <Icon icon="fa6-solid:xmark" className="mr-1.5 text-[11px]" />Hủy đơn
                </Button>
              </div>

              {cancelingId === p.prescription_id && (
                <form
                  onSubmit={e => handleCancelSubmit(p, e)}
                  className="mt-3 rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/5 p-3"
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
                      disabled={actingId === p.prescription_id}
                      className="h-auto rounded-full bg-[#dc3545] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#dc3545]/90"
                    >
                      {actingId === p.prescription_id ? 'Đang hủy…' : 'Xác nhận hủy'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCancelingId(null)}
                      className="h-auto rounded-full border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
                    >
                      Đóng
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
