import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { listImagingWorklist } from '@/api/imaging';
import { resolveError } from '@/utils/errorMessages';
import { imagingStudyStatusLabel, imagingReportStatusLabel } from '@/utils/labels';
import { imagingStudyBadgeClass } from '@/utils/badgeStyles';
import { useAuth } from '@/context/AuthContext';
import ImagingOrderPanel from '@/components/ImagingOrderPanel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';

interface ImagingWorklistItem {
  order_id: number | string;
  encounter_id: number | string;
  patient_id: number | string;
  patient_name: string;
  patient_mrn: string;
  order_name: string;
  order_status: string;
  accession_number?: string;
  study_status: string;
  report_status: string;
  ordered_at: string;
}

const STATUS_FILTER_VALUES = ['scheduled', 'in_progress', 'completed'];

export default function ImagingWorklist() {
  const { role } = useAuth();
  const [items, setItems] = useState<ImagingWorklistItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listImagingWorklist(statusFilter.length === 0 ? undefined : statusFilter.join(','));
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
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hàng đợi chẩn đoán hình ảnh</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Toàn bộ chỉ định CĐHA đang chờ xử lý — Lên lịch → Chụp & đẩy PACS → Báo cáo → Duyệt kết quả
          </p>
        </div>
        <MultiSelect
          options={STATUS_FILTER_VALUES.map(s => ({ value: s, label: imagingStudyStatusLabel(s) }))}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tất cả trạng thái"
          className="w-[220px]"
        />
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
          <Icon icon="fa6-solid:x-ray" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
          <h3 className="mb-2 text-[#274760]">Không có chỉ định chẩn đoán hình ảnh nào đang chờ</h3>
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
                    {item.accession_number && ` · Mã lượt chụp: ${item.accession_number}`}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge className={imagingStudyBadgeClass(item.study_status)}>
                    {item.study_status ? imagingStudyStatusLabel(item.study_status) : 'Chưa lên lịch'}
                  </Badge>
                  {item.study_status === 'completed' && (
                    <Badge className="rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10">
                      {imagingReportStatusLabel(item.report_status)}
                    </Badge>
                  )}
                  <Link
                    to={`/encounters/${item.encounter_id}`}
                    className="text-[13px] font-medium text-[#307bc4] no-underline hover:underline"
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              </div>
              <ImagingOrderPanel orderId={item.order_id} orderStatus={item.order_status} role={role} onOrderChanged={fetchWorklist} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
