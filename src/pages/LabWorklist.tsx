import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { listLabWorklist } from '@/api/lab';
import { resolveError } from '@/utils/errorMessages';
import { labSpecimenStatusLabel } from '@/utils/labels';
import { toneBadgeClass } from '@/utils/badgeStyles';
import { useAuth } from '@/context/AuthContext';
import LabOrderPanel from '@/components/LabOrderPanel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';

interface LabWorklistItem {
  order_id: number | string;
  encounter_id: number | string;
  patient_id: number | string;
  patient_name: string;
  patient_mrn: string;
  order_name: string;
  order_status: string;
  specimen_status: string;
  item_count: number;
  resulted_count: number;
  ordered_at: string;
}

const STATUS_FILTER_VALUES = ['pending_collection', 'collected', 'received'];

function specimenBadgeClass(status: string): string {
  switch (status) {
    case 'received':
      return toneBadgeClass('info');
    case 'collected':
      return toneBadgeClass('warning');
    default:
      return toneBadgeClass('neutral');
  }
}

export default function LabWorklist() {
  const { role } = useAuth();
  const [items, setItems] = useState<LabWorklistItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listLabWorklist(statusFilter.length === 0 ? undefined : statusFilter.join(','));
      setItems(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchWorklist();
  }, [fetchWorklist]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hàng đợi xét nghiệm</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Toàn bộ chỉ định xét nghiệm đang chờ xử lý — Chỉ định → Lấy mẫu → Nhận mẫu → Thực hiện → Duyệt kết quả
          </p>
        </div>
        <MultiSelect
          options={STATUS_FILTER_VALUES.map(s => ({ value: s, label: labSpecimenStatusLabel(s) }))}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tất cả trạng thái"
          className="w-[220px]"
        />
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-15 text-center text-[#6c757d]">
          <Icon icon="fa6-solid:vial-circle-check" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
          <h3 className="mb-2 text-[#274760]">Không có chỉ định xét nghiệm nào đang chờ</h3>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map(item => (
            <Card key={item.order_id} className="rounded-2xl border-[#e8edf2] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">
                    {item.patient_name} <span className="text-xs font-normal text-[#6c757d]">({item.patient_mrn})</span>
                  </div>
                  <div className="text-sm text-[#6c757d]">
                    {item.order_name} · {new Date(item.ordered_at).toLocaleString('vi-VN')}
                    {item.item_count > 0 && ` · ${item.resulted_count}/${item.item_count} đã có kết quả`}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge className={specimenBadgeClass(item.specimen_status)}>
                    {labSpecimenStatusLabel(item.specimen_status)}
                  </Badge>
                  <Link
                    to={`/encounters/${item.encounter_id}`}
                    className="text-[13px] font-medium text-[#307bc4] no-underline hover:underline"
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              </div>
              <LabOrderPanel orderId={item.order_id} orderName={item.order_name} orderStatus={item.order_status} role={role} onOrderChanged={fetchWorklist} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
