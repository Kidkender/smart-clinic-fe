import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
import { listAuditLogs } from '@/api/audit';
import { listUsers } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';

const PAGE_LIMIT = 20;

interface AuditLog {
  ID: number;
  ActorID: number;
  Action: string;
  Entity: string;
  EntityID: number;
  Detail: string;
  CreatedAt: string;
}

interface User {
  ID: number | string;
  Fullname: string;
  Email: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [entityInput, setEntityInput] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    listUsers({}).then(r => setUsers(r.data ?? [])).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setEntity(entityInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [entityInput]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAuditLogs({
        page,
        limit: PAGE_LIMIT,
        actor_id: actorFilter || undefined,
        entity: entity || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setLogs(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, actorFilter, entity, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actorFilter, entity, from, to]);

  const hasActiveFilters = !!actorFilter || !!entityInput || !!from || !!to;

  const handleResetFilters = () => {
    setActorFilter('');
    setEntityInput('');
    setFrom('');
    setTo('');
  };

  const actorName = (actorId: number) => {
    const user = users.find(u => String(u.ID) === String(actorId));
    return user ? user.Fullname : `#${actorId}`;
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Nhật ký hệ thống</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Lịch sử thao tác của người dùng trên hệ thống (bệnh án, đơn thuốc, viện phí...)
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <Select value={actorFilter || 'all'} onValueChange={v => setActorFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-auto w-[220px] rounded-xl border-[#dde2e8] px-4 py-2.75 text-sm text-[#274760]">
            <SelectValue placeholder="Tất cả người dùng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả người dùng</SelectItem>
            {users.map(u => (
              <SelectItem key={u.ID} value={String(u.ID)}>{u.Fullname} ({u.Email})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-[180px]">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={entityInput}
            onChange={e => setEntityInput(e.target.value)}
            placeholder="Đối tượng (vd: patient)…"
            className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <DatePicker value={from} onChange={setFrom} placeholder="Từ ngày" max={to || undefined} />
        <DatePicker value={to} onChange={setTo} placeholder="Đến ngày" min={from || undefined} />
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.75 text-sm font-medium text-[#6c757d] hover:text-[#dc3545]"
          >
            <Icon icon="fa6-solid:filter-circle-xmark" className="text-sm" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : logs.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:clock-rotate-left" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">
              {hasActiveFilters ? 'Không có nhật ký nào phù hợp' : 'Chưa có nhật ký nào được ghi nhận'}
            </h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thời gian</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Người thực hiện</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Hành động</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Đối tượng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {new Date(log.CreatedAt).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">
                    {actorName(log.ActorID)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{log.Action}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {log.Entity} #{log.EntityID}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#6c757d]">{log.Detail || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="nhật ký" />
      )}
    </>
  );
}
