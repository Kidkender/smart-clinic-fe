import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { listImagingWorklist, listImagingHistory } from '@/api/imaging';
import { resolveError } from '@/utils/errorMessages';
import { imagingStudyStatusLabel, imagingReportStatusLabel, orderStatusLabel } from '@/utils/labels';
import { imagingStudyBadgeClass, toneBadgeClass } from '@/utils/badgeStyles';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import ImagingOrderPanel from '@/components/ImagingOrderPanel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';

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
const HISTORY_PAGE_LIMIT = 20;

function orderStatusBadgeClass(status: string): string {
  return status === 'cancelled' ? toneBadgeClass('neutral') : toneBadgeClass('success');
}

export default function ImagingWorklist() {
  const { role } = useAuth();
  const [view, setView] = useState<'active' | 'history'>('active');

  const [items, setItems] = useState<ImagingWorklistItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [historyItems, setHistoryItems] = useState<ImagingWorklistItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

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

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await listImagingHistory({
        page: historyPage,
        limit: HISTORY_PAGE_LIMIT,
        from: historyFrom || undefined,
        to: historyTo || undefined,
      });
      setHistoryItems(result.data ?? []);
      setHistoryTotal(result.meta?.total ?? 0);
      setHistoryTotalPages(Math.max(result.meta?.total_pages ?? 1, 1));
    } catch (err) {
      setHistoryError(resolveError(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyFrom, historyTo]);

  useEffect(() => {
    if (view === 'history') fetchHistory();
  }, [view, fetchHistory]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hàng đợi chẩn đoán hình ảnh</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            {view === 'active'
              ? 'Toàn bộ chỉ định CĐHA đang chờ xử lý — Lên lịch → Chụp & đẩy PACS → Báo cáo → Duyệt kết quả'
              : 'Các chỉ định CĐHA đã hoàn tất hoặc đã hủy'}
          </p>
        </div>
        {view === 'active' && (
          <MultiSelect
            options={STATUS_FILTER_VALUES.map(s => ({ value: s, label: imagingStudyStatusLabel(s) }))}
            selected={statusFilter}
            onChange={setStatusFilter}
            placeholder="Tất cả trạng thái"
            className="w-[220px]"
          />
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[#e8edf2] bg-[#f4f7fa] p-1.5">
        <button
          type="button"
          onClick={() => setView('active')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold no-underline transition-colors',
            view === 'active' ? 'bg-white text-[#307bc4] shadow-sm' : 'text-[#6c757d] hover:text-[#274760]',
          )}
        >
          <Icon icon="fa6-solid:list-check" className="text-xs" />
          Đang xử lý
        </button>
        <button
          type="button"
          onClick={() => setView('history')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold no-underline transition-colors',
            view === 'history' ? 'bg-white text-[#307bc4] shadow-sm' : 'text-[#6c757d] hover:text-[#274760]',
          )}
        >
          <Icon icon="fa6-solid:clock-rotate-left" className="text-xs" />
          Lịch sử
        </button>
      </div>

      {view === 'active' ? (
        <>
          {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

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
                        <Badge className={toneBadgeClass('neutral')}>
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
                  <ImagingOrderPanel orderId={item.order_id} orderName={item.order_name} orderStatus={item.order_status} role={role} onOrderChanged={fetchWorklist} />
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-xl border border-border bg-background py-2.75 pr-3.5 pl-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Từ ngày</span>
                <DatePicker
                  value={historyFrom}
                  onChange={v => { setHistoryFrom(v); setHistoryPage(1); }}
                  max={historyTo || undefined}
                  className="h-auto w-[110px] justify-start gap-1.5 border-0 bg-transparent p-0 text-sm text-[#274760] shadow-none hover:bg-transparent"
                />
              </div>
              <div className="mx-3 h-4.5 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Đến ngày</span>
                <DatePicker
                  value={historyTo}
                  onChange={v => { setHistoryTo(v); setHistoryPage(1); }}
                  min={historyFrom || undefined}
                  className="h-auto w-[110px] justify-start gap-1.5 border-0 bg-transparent p-0 text-sm text-[#274760] shadow-none hover:bg-transparent"
                />
              </div>
            </div>
          </div>

          {historyError && <ErrorAlert className="mb-5">{historyError}</ErrorAlert>}

          {historyLoading ? (
            <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
          ) : historyItems.length === 0 ? (
            <div className="p-15 text-center text-[#6c757d]">
              <Icon icon="fa6-solid:clock-rotate-left" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
              <h3 className="mb-2 text-[#274760]">Không có chỉ định chẩn đoán hình ảnh nào trong khoảng thời gian này</h3>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {historyItems.map(item => (
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
                      <Badge className={orderStatusBadgeClass(item.order_status)}>
                        {orderStatusLabel(item.order_status)}
                      </Badge>
                      <Link
                        to={`/encounters/${item.encounter_id}`}
                        className="text-[13px] font-medium text-[#307bc4] no-underline hover:underline"
                      >
                        Xem hồ sơ
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!historyLoading && historyTotal > 0 && (
            <Pagination page={historyPage} totalPages={historyTotalPages} total={historyTotal} onPageChange={setHistoryPage} itemLabel="chỉ định" />
          )}
        </>
      )}
    </>
  );
}
