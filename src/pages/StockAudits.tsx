import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createStockAudit, listStockAudits } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { stockAuditStatusLabel, stockAuditStatusBadgeClass } from '@/utils/labels';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StockAudit } from '@/components/inventory/types';
import InventoryTabs from '@/components/inventory/InventoryTabs';

const createAuditSchema = z.object({
  notes: z.string(),
});

type CreateAuditFormValues = z.infer<typeof createAuditSchema>;

const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Đang kiểm kê' },
  { value: 'completed', label: 'Đã hoàn tất' },
];

export default function StockAudits() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<StockAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('audit_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, reset,
  } = useForm<CreateAuditFormValues>({
    resolver: zodResolver(createAuditSchema),
    defaultValues: { notes: '' },
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listStockAudits({
        q: search || undefined,
        status: statusFilter.length === 0 ? undefined : statusFilter.join(','),
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setAudits(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const hasActiveFilters = !!searchInput || statusFilter.length > 0;

  const handleResetFilters = () => {
    setSearchInput('');
    setStatusFilter([]);
  };

  const openCreate = () => {
    reset({ notes: '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      const auditDate = new Date().toISOString().slice(0, 10);
      const result = await createStockAudit({ audit_date: auditDate, notes: values.notes.trim() });
      setModalOpen(false);
      navigate(`/inventory/audits/${result.data.ID}`);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Kiểm kê kho</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Các đợt kiểm kê định kỳ và xử lý chênh lệch tồn kho</p>
        </div>
        <Button onClick={openCreate} size="cta">
          <Icon icon="fa6-solid:plus" className="text-sm" />
          Tạo đợt kiểm kê mới
        </Button>
      </div>

      <InventoryTabs />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[280px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#adb5bd]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo ghi chú…"
            className="h-auto rounded-xl border-[#dde2e8] py-3 pr-4 pl-10 text-[15px] text-[#274760]"
          />
        </div>
        <MultiSelect
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tất cả trạng thái"
          className="w-[200px]"
        />
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#dc3545]"
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
        ) : audits.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Chưa có đợt kiểm kê nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="Ngày kiểm kê" column="audit_date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ghi chú</TableHead>
                <SortableTableHead label="Trạng thái" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Hoàn tất lúc" column="completed_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(a => (
                <TableRow key={a.ID} onClick={() => navigate(`/inventory/audits/${a.ID}`)} className="cursor-pointer border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#307bc4]">{new Date(a.AuditDate).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Notes || '—'}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={stockAuditStatusBadgeClass(a.Status)}>{stockAuditStatusLabel(a.Status)}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {a.CompletedAt ? new Date(a.CompletedAt).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="sm:max-w-[460px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Tạo đợt kiểm kê mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate>
            <p className="mt-4 mb-0 text-sm text-[#6c757d]">
              Hệ thống sẽ chụp lại tồn kho hiện tại của toàn bộ danh mục thuốc để đối chiếu khi kiểm đếm.
            </p>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ghi chú</label>
            <Textarea {...register('notes')} placeholder="VD: Kiểm kê định kỳ quý 3/2026" className="min-h-[80px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />

            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="cta"
              >
                {saving ? 'Đang tạo…' : 'Tạo đợt kiểm kê'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
