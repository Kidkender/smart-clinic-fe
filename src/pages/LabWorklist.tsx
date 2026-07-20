import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { listLabWorklist } from '@/api/lab';
import { resolveError } from '@/utils/errorMessages';
import { labSpecimenStatusLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import LabOrderPanel from '@/components/LabOrderPanel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LabWorklistItem {
  OrderID: number | string;
  EncounterID: number | string;
  PatientID: number | string;
  PatientName: string;
  PatientMRN: string;
  OrderName: string;
  SpecimenStatus: string;
  ItemCount: number;
  ResultedCount: number;
  OrderedAt: string;
}

const STATUS_FILTERS = ['all', 'pending_collection', 'collected', 'received'];

function specimenBadgeClass(status: string): string {
  switch (status) {
    case 'received':
      return 'rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4] hover:bg-[#307bc4]/10';
    case 'collected':
      return 'rounded-full bg-[#ffc107]/15 px-2.5 py-1 text-xs font-semibold text-[#8a6100] hover:bg-[#ffc107]/15';
    default:
      return 'rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10';
  }
}

export default function LabWorklist() {
  const { role } = useAuth();
  const [items, setItems] = useState<LabWorklistItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listLabWorklist(statusFilter === 'all' ? undefined : statusFilter);
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-auto w-[220px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUS_FILTERS.filter(s => s !== 'all').map(s => (
              <SelectItem key={s} value={s}>{labSpecimenStatusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Icon icon="fa6-solid:vial-circle-check" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
          <h3 className="mb-2 text-[#274760]">Không có chỉ định xét nghiệm nào đang chờ</h3>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map(item => (
            <Card key={item.OrderID} className="rounded-2xl border-[#e8edf2] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">
                    {item.PatientName} <span className="text-xs font-normal text-[#6c757d]">({item.PatientMRN})</span>
                  </div>
                  <div className="text-sm text-[#6c757d]">
                    {item.OrderName} · {new Date(item.OrderedAt).toLocaleString('vi-VN')}
                    {item.ItemCount > 0 && ` · ${item.ResultedCount}/${item.ItemCount} đã có kết quả`}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge className={specimenBadgeClass(item.SpecimenStatus)}>
                    {labSpecimenStatusLabel(item.SpecimenStatus)}
                  </Badge>
                  <Link
                    to={`/encounters/${item.EncounterID}`}
                    className="text-[13px] font-medium text-[#307bc4] no-underline hover:underline"
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              </div>
              <LabOrderPanel orderId={item.OrderID} role={role} onOrderChanged={fetchWorklist} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
