import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listEmailDeliveryLogs, resendEmail } from '@/api/emailLog';
import { resolveError } from '@/utils/errorMessages';
import { emailEventTypeLabel, emailStatusLabel, emailStatusBadgeClass } from '@/utils/labels';

interface EmailDeliveryLog {
  ID: number;
  EventType: string;
  ReferenceType: string;
  ReferenceID: number;
  PatientID: number;
  RecipientEmail: string;
  Subject: string;
  Status: string;
  Error: string;
  SentAt: string | null;
  CreatedAt: string;
  Patient?: { Fullname: string; MRN: string };
}

const PAGE_LIMIT = 20;
const STATUS_OPTIONS = ['pending', 'queued', 'sent', 'failed'].map(value => ({
  value,
  label: emailStatusLabel(value),
}));

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailDeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listEmailDeliveryLogs({
        status: statusFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setLogs(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResend = async (id: number) => {
    setResendingId(id);
    setError('');
    try {
      await resendEmail(id);
      await fetchLogs();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Nhật ký email</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Nhật ký email nhắc lịch, hướng dẫn dùng thuốc và khảo sát hài lòng</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <Select
          value={statusFilter || 'all'}
          onValueChange={value => setStatusFilter(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="h-auto w-[220px] rounded-xl px-4 py-2.75 text-sm">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : logs.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Chưa có email nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Loại email</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Email nhận</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Gửi lúc</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Lỗi</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {log.Patient?.Fullname ?? '—'}
                    {log.Patient?.MRN && <span className="ml-1 text-xs font-normal text-[#6c757d]">({log.Patient.MRN})</span>}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{emailEventTypeLabel(log.EventType)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{log.RecipientEmail}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={emailStatusBadgeClass(log.Status)}>{emailStatusLabel(log.Status)}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {log.SentAt ? new Date(log.SentAt).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate px-4 py-3 text-sm text-[#dc3545]" title={log.Error || undefined}>
                    {log.Error || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {log.Status === 'failed' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="cta-xs"
                        disabled={resendingId === log.ID}
                        onClick={() => handleResend(log.ID)}
                      >
                        {resendingId === log.ID ? 'Đang gửi lại…' : 'Gửi lại'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && logs.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="email" />
      )}
    </>
  );
}
