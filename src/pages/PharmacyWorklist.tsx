import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { listPrescriptionWorklist } from '@/api/prescription';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PharmacyTabs from '@/components/pharmacy/PharmacyTabs';

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
  ready_at?: string | null;
  items: WorklistDrugItem[];
}

export default function PharmacyWorklist() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorklistPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Cấp thuốc ngoại trú</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Toàn bộ đơn thuốc đang chờ cấp phát — chỉ hiện đơn của các lượt khám bác sĩ đã hoàn tất
        </p>
      </div>

      <PharmacyTabs />

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

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
            <Card
              key={p.prescription_id}
              onClick={() => navigate(`/pharmacy/worklist/${p.encounter_id}/${p.prescription_id}`)}
              className="cursor-pointer rounded-2xl border-[#e8edf2] p-6 transition-colors hover:border-[#307bc4]/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">
                    {p.patient_name} <span className="text-xs font-normal text-[#6c757d]">({p.patient_mrn})</span>
                  </div>
                  <div className="text-sm text-[#6c757d]">
                    Đơn #{p.prescription_id} · {new Date(p.created_at).toLocaleString('vi-VN')} · {p.items.length} thuốc
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {p.ready_at && (
                    <span className="rounded-full bg-[#ffc107]/15 px-3 py-1 text-xs font-semibold text-[#8a6100]">
                      Đã xác nhận đủ thuốc — chờ thanh toán
                    </span>
                  )}
                  <Button
                    variant="outline"
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#274760]"
                  >
                    Chi tiết
                    <Icon icon="fa6-solid:chevron-right" className="ml-1.5 text-[11px]" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
