import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { listStockTransactions } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { stockTransactionTypeLabel, stockTransactionTypeBadgeClass, STOCK_TRANSACTION_TYPES } from '@/utils/labels';
import type { StockTransaction } from '@/components/inventory/types';
import InventoryTabs from '@/components/inventory/InventoryTabs';

const PAGE_LIMIT = 20;

export default function StockTransactions() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drugQuery, setDrugQuery] = useState('');
  const [appliedDrugQuery, setAppliedDrugQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listStockTransactions({
        page,
        limit: PAGE_LIMIT,
        type: typeFilter === 'all' ? undefined : typeFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setTransactions(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, dateFrom, dateTo, appliedDrugQuery]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAppliedDrugQuery(drugQuery.trim().toLowerCase());
  };

  const visibleTransactions = appliedDrugQuery
    ? transactions.filter(t => (t.Drug?.Name ?? '').toLowerCase().includes(appliedDrugQuery))
    : transactions;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Lịch sử xuất-nhập kho</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Nhật ký giao dịch nhập/xuất/điều chỉnh tồn kho</p>
        </div>
      </div>

      <InventoryTabs />

      <form onSubmit={handleSearchSubmit} noValidate className="mb-5 flex flex-wrap items-center gap-2.5">
        <Input
          value={drugQuery}
          onChange={e => setDrugQuery(e.target.value)}
          placeholder="Tìm theo tên thuốc…"
          className="h-auto max-w-[280px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
        />
        <Button
          type="submit"
          variant="outline"
          className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
        >
          Tìm kiếm
        </Button>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-auto w-[200px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {STOCK_TRANSACTION_TYPES.map(t => <SelectItem key={t} value={t}>{stockTransactionTypeLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <DatePicker
          value={dateFrom}
          onChange={setDateFrom}
          placeholder="Từ ngày"
          className="h-auto w-[160px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
        />
        <DatePicker
          value={dateTo}
          onChange={setDateTo}
          placeholder="Đến ngày"
          className="h-auto w-[160px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
        />
      </form>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : visibleTransactions.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không có giao dịch nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thời gian</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thuốc</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Lô</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Loại</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Số lượng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTransactions.map(t => (
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
                  <TableCell className="px-4 py-3 text-sm text-[#6c757d]">{t.Notes || t.Reference || '—'}</TableCell>
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
