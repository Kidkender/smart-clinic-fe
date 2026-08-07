import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { MultiSelect } from '@/components/ui/multi-select';
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
import SortableTableHead from '@/components/ui/sortable-table-head';
import InvoiceDialog from '@/components/consultation/InvoiceDialog';
import { listInvoices } from '@/api/billing';
import { getDepartments } from '@/api/department';
import { resolveError } from '@/utils/errorMessages';
import { invoiceStatusLabel } from '@/utils/labels';
import { invoiceStatusBadgeClass } from '@/utils/badgeStyles';

const PAGE_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: 'unpaid', label: invoiceStatusLabel('unpaid') },
  { value: 'partially_paid', label: invoiceStatusLabel('partially_paid') },
  { value: 'paid', label: invoiceStatusLabel('paid') },
  { value: 'cancelled', label: invoiceStatusLabel('cancelled') },
];

interface Department {
  ID: number | string;
  Name: string;
}

interface InvoiceRow {
  ID: number;
  EncounterID: number;
  Status: string;
  TotalAmount: number;
  CreatedAt: string;
  Encounter?: {
    Patient?: { Fullname?: string; MRN?: string };
    Department?: { Name?: string };
  };
}

export default function Invoices() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [openEncounterId, setOpenEncounterId] = useState<string | null>(null);

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listInvoices({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter.length === 0 ? undefined : statusFilter.join(','),
        department_id: departmentFilter || undefined,
        q: search || undefined,
        from: from || undefined,
        to: to || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setInvoices(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, departmentFilter, search, from, to, sortBy, sortDir]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, departmentFilter, search, from, to]);

  const hasActiveFilters = !!searchInput || statusFilter.length > 0 || !!departmentFilter || !!from || !!to;

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter([]);
    setDepartmentFilter('');
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

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hóa đơn viện phí</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Tra cứu hóa đơn theo bệnh nhân, trạng thái, khoa và khoảng thời gian
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên bệnh nhân, mã bệnh án (MRN)…"
            className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <MultiSelect
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tất cả trạng thái"
          className="w-[180px]"
        />
        <Select value={departmentFilter || 'all'} onValueChange={v => setDepartmentFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-auto w-[180px] rounded-xl border-[#dde2e8] px-4 py-2.75 text-sm text-[#274760]">
            <SelectValue placeholder="Tất cả khoa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khoa</SelectItem>
            {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
          </SelectContent>
        </Select>
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
        ) : invoices.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:file-invoice-dollar" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">
              {hasActiveFilters ? 'Không có hóa đơn nào phù hợp' : 'Chưa có hóa đơn nào'}
            </h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="Ngày tạo" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoa</TableHead>
                <SortableTableHead label="Tổng tiền" column="total_amount" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Trạng thái" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(invoice => (
                <TableRow
                  key={invoice.ID}
                  className="cursor-pointer border-t border-[#f0f4f8] hover:bg-[#f4f7fa]"
                  onClick={() => setOpenEncounterId(String(invoice.EncounterID))}
                >
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {new Date(invoice.CreatedAt).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">
                    {invoice.Encounter?.Patient?.Fullname ?? '—'}
                    {invoice.Encounter?.Patient?.MRN && (
                      <span className="ml-1.5 font-normal text-[#6c757d]">({invoice.Encounter.Patient.MRN})</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {invoice.Encounter?.Department?.Name ?? '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {invoice.TotalAmount.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={invoiceStatusBadgeClass(invoice.Status)}>{invoiceStatusLabel(invoice.Status)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="hóa đơn" />
      )}

      <InvoiceDialog
        open={openEncounterId != null}
        onClose={() => { setOpenEncounterId(null); fetchInvoices(); }}
        encounterId={openEncounterId ?? ''}
      />
    </>
  );
}
