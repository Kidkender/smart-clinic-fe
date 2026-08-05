import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { getAttendanceSummary } from '@/api/hr';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Tìm nhân viên</label>
            <Input
              placeholder="Tên hoặc mã nhân viên…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-auto max-w-[220px] rounded-xl py-2.75"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Từ ngày</label>
            <Input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="h-auto max-w-[170px] rounded-xl py-2.75"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Đến ngày</label>
            <Input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="h-auto max-w-[170px] rounded-xl py-2.75"
            />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6c757d]">Đang tải…</TableCell></TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6c757d]">Không có dữ liệu chấm công phù hợp.</TableCell></TableRow>
            ) : (
              filteredEntries.map(e => (
                <TableRow key={e.staff_id}>
                  <TableCell className="font-semibold text-[#274760]">{e.staff_name}</TableCell>
                  <TableCell>{e.worked_days}</TableCell>
                  <TableCell>{formatHours(e.total_minutes)}</TableCell>
                  <TableCell>{e.late_count}</TableCell>
                  <TableCell>{e.absent_count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
