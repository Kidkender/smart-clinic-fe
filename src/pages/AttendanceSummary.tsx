import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { getAttendanceSummary } from '@/api/hr';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SummaryEntry {
  staff_id: number | string;
  staff_name: string;
  worked_days: number;
  total_minutes: number;
  late_count: number;
  absent_count: number;
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

function formatHours(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes > 0 ? ` ${minutes}p` : ''}`;
}

export default function AttendanceSummary() {
  const navigate = useNavigate();
  const defaultRange = currentMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<SummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAttendanceSummary({ from, to });
      setEntries(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const filteredEntries = entries.filter(e => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return e.staff_name.toLowerCase().includes(q) || String(e.staff_id).includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={() => navigate('/employees')} className="text-sm text-[#307bc4]">← Danh sách nhân sự</button>
        <h1 className="mt-1 text-2xl font-bold text-[#274760]">Bảng chấm công</h1>
        <p className="text-sm text-[#6c757d]">Tổng hợp ngày công, giờ công, số lần trễ để làm căn cứ tính lương. Chọn cùng 1 ngày ở "Từ ngày"/"Đến ngày" để xem ai đã làm việc hôm đó.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
            <Input
              placeholder="Tìm nhân viên theo tên hoặc mã…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
            />
          </div>
          <div className="flex items-center rounded-xl border border-border bg-background py-2.75 pr-3.5 pl-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Từ ngày</span>
              <DatePicker
                value={from}
                onChange={setFrom}
                max={to || undefined}
                className="h-auto w-[110px] justify-start gap-1.5 border-0 bg-transparent p-0 text-sm text-[#274760] shadow-none hover:bg-transparent"
              />
            </div>
            <div className="mx-3 h-4.5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Đến ngày</span>
              <DatePicker
                value={to}
                onChange={setTo}
                min={from || undefined}
                className="h-auto w-[110px] justify-start gap-1.5 border-0 bg-transparent p-0 text-sm text-[#274760] shadow-none hover:bg-transparent"
              />
            </div>
          </div>
        </div>
      </Card>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <p className="text-sm text-[#6c757d]">
        Tổng: <span className="font-semibold text-[#274760]">{filteredEntries.length}</span> nhân viên có chấm công trong khoảng đã chọn.
      </p>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Số ngày công</TableHead>
              <TableHead>Tổng giờ công</TableHead>
              <TableHead>Số lần trễ</TableHead>
              <TableHead>Số ngày vắng</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-[#6c757d]">Đang tải…</TableCell></TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-[#6c757d]">Không có dữ liệu chấm công phù hợp.</TableCell></TableRow>
            ) : (
              filteredEntries.map(e => (
                <TableRow key={e.staff_id}>
                  <TableCell className="font-semibold text-[#274760]">{e.staff_name}</TableCell>
                  <TableCell>{e.worked_days}</TableCell>
                  <TableCell>{formatHours(e.total_minutes)}</TableCell>
                  <TableCell>{e.late_count}</TableCell>
                  <TableCell>{e.absent_count}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/employees/${e.staff_id}`)}
                      title="Xem chi tiết giờ vào/ra"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#307bc4]"
                    >
                      <Icon icon="fa6-solid:eye" className="text-[13px]" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
