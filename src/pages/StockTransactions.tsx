import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { listStockTransactions } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { stockTransactionTypeLabel, stockTransactionTypeBadgeClass, stockTransactionReferenceLabel, STOCK_TRANSACTION_TYPES } from '@/utils/labels';
import type { StockTransaction } from '@/components/inventory/types';
import InventoryTabs from '@/components/inventory/InventoryTabs';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

const TYPE_OPTIONS = STOCK_TRANSACTION_TYPES.map(value => ({ value, label: stockTransactionTypeLabel(value) }));

export default function StockTransactions() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drugQueryInput, setDrugQueryInput] = useState('');
  const [drugQuery, setDrugQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDrugQuery(drugQueryInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [drugQueryInput]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listStockTransactions({
        page,
        limit: PAGE_LIMIT,
        q: drugQuery || undefined,
        type: typeFilter.length === 0 ? undefined : typeFilter.join(','),
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setTransactions(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, drugQuery, typeFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, drugQuery]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const hasActiveFilters = !!drugQueryInput || typeFilter.length > 0;

  const handleResetFilters = () => {
    setDrugQueryInput('');
    setTypeFilter([]);
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Lịch sử xuất-nhập kho</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Nhật ký giao dịch nhập/xuất/điều chỉnh tồn kho</p>
        </div>
      </div>

      <InventoryTabs />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[280px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#adb5bd]" />
          <Input
            value={drugQueryInput}
            onChange={e => setDrugQueryInput(e.target.value)}
            placeholder="Tìm theo tên thuốc…"
            className="h-auto rounded-xl border-[#dde2e8] py-3 pr-4 pl-10 text-[15px] text-[#274760]"
          />
        </div>
        <MultiSelect
          options={TYPE_OPTIONS}
          selected={typeFilter}
          onChange={setTypeFilter}
          placeholder="Tất cả loại"
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
        ) : transactions.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không có giao dịch nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="Thời gian" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thuốc</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Lô</TableHead>
                <SortableTableHead label="Loại" column="type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Số lượng" column="quantity" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(t => (
                <TableRow key={t.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{new Date(t.CreatedAt).toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">{t.Drug?.Name ?? `#${t.DrugID}`}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono text-[#274760]">{t.Batch?.LotNumber ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={stockTransactionTypeBadgeClass(t.Type)}>{stockTransactionTypeLabel(t.Type)}</Badge>
                  </TableCell>
                  <TableCell className={`px-4 py-3 text-sm font-semibold ${t.Quantity < 0 ? 'text-[#dc3545]' : 'text-[#198754]'}`}>
                    {t.Quantity > 0 ? `+${t.Quantity}` : t.Quantity}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#6c757d]">{t.Notes || stockTransactionReferenceLabel(t.Reference) || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="giao dịch" />
      )}
    </>
  );
}
