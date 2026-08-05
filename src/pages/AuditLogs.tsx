import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SortableTableHead from '@/components/ui/sortable-table-head';
import { listAuditLogs } from '@/api/audit';
import { listUsers } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { auditActionLabel, auditEntityLabel, AUDIT_ACTIONS, AUDIT_ENTITIES, roleLabel, ROLES } from '@/utils/labels';

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
  Role: string;
}

const ROLE_OPTIONS = ROLES.map(value => ({ value, label: roleLabel(value) }));
const ENTITY_OPTIONS = AUDIT_ENTITIES.map(value => ({ value, label: auditEntityLabel(value) }));
const ACTION_OPTIONS = AUDIT_ACTIONS.map(value => ({ value, label: auditActionLabel(value) }));

export default function AuditLogs() {
  const [searchParams] = useSearchParams();
  const urlEntityID = searchParams.get('entity_id');
  const urlEntity = searchParams.get('entity');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actorSearchInput, setActorSearchInput] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [entityFilter, setEntityFilter] = useState<string[]>(urlEntity ? [urlEntity] : []);
  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    listUsers({}).then(r => setUsers(r.data ?? [])).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setActorSearch(actorSearchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [actorSearchInput]);

  const actorNarrowingActive = roleFilter.length > 0 || !!actorSearch;

  const matchedActorIds = useMemo(() => {
    if (!actorNarrowingActive) return null;
    const q = actorSearch.toLowerCase();
    return users
      .filter(u => {
        const matchesRole = roleFilter.length === 0 || roleFilter.includes(u.Role);
        const matchesSearch = !q || u.Fullname.toLowerCase().includes(q) || u.Email.toLowerCase().includes(q);
        return matchesRole && matchesSearch;
      })
      .map(u => String(u.ID));
  }, [users, roleFilter, actorSearch, actorNarrowingActive]);

  const fetchLogs = useCallback(async () => {
    if (matchedActorIds !== null && matchedActorIds.length === 0) {
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await listAuditLogs({
        page,
        limit: PAGE_LIMIT,
        actor_id: matchedActorIds ? matchedActorIds.join(',') : undefined,
        entity: entityFilter.length === 0 ? undefined : entityFilter.join(','),
        entity_id: urlEntityID || undefined,
        action: actionFilter.length === 0 ? undefined : actionFilter.join(','),
        from: from || undefined,
        to: to || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setLogs(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, matchedActorIds, entityFilter, urlEntityID, actionFilter, from, to, sortBy, sortDir]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [matchedActorIds, entityFilter, actionFilter, from, to]);

  const hasActiveFilters = actorNarrowingActive || entityFilter.length > 0 || actionFilter.length > 0 || !!from || !!to;

  const handleResetFilters = () => {
    setActorSearchInput('');
    setActorSearch('');
    setRoleFilter([]);
    setEntityFilter([]);
    setActionFilter([]);
    setFrom('');
    setTo('');
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
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

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={actorSearchInput}
            onChange={e => setActorSearchInput(e.target.value)}
            placeholder="Tìm người thực hiện theo tên, email…"
            className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <MultiSelect
          options={ROLE_OPTIONS}
          selected={roleFilter}
          onChange={setRoleFilter}
          placeholder="Tất cả vai trò"
          className="w-[180px]"
        />
        {actorNarrowingActive && (
          <span className="text-sm text-[#6c757d]">
            {matchedActorIds?.length ?? 0} người dùng khớp
          </span>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <MultiSelect
          options={ENTITY_OPTIONS}
          selected={entityFilter}
          onChange={setEntityFilter}
          placeholder="Tất cả đối tượng"
          className="w-[200px]"
        />
        <MultiSelect
          options={ACTION_OPTIONS}
          selected={actionFilter}
          onChange={setActionFilter}
          placeholder="Tất cả hành động"
          className="w-[200px]"
        />
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
                <SortableTableHead label="Thời gian" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Người thực hiện" column="actor_id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Hành động" column="action" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Đối tượng" column="entity" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
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
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{auditActionLabel(log.Action)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {auditEntityLabel(log.Entity)} #{log.EntityID}
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
