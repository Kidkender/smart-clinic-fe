import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { searchDrugs } from '@/api/drug';
import { lowStockAlerts, expiringBatches } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import InventoryTabs from '@/components/inventory/InventoryTabs';
import DrugFormDialog from '@/components/inventory/DrugFormDialog';
import StockInDialog from '@/components/inventory/StockInDialog';
import StockOutDialog from '@/components/inventory/StockOutDialog';
import type { Drug, DrugBatch } from '@/components/inventory/types';

const EXPIRING_DAYS = 30;
const SEARCH_DEBOUNCE_MS = 400;

const STOCK_STATUS_OPTIONS = [
  { value: 'in_stock', label: 'Còn hàng' },
  { value: 'low', label: 'Dưới định mức' },
  { value: 'out', label: 'Hết hàng' },
];

type DrugModal =
  | { mode: 'create' }
  | { mode: 'edit'; drug: Drug }
  | null;

export default function Inventory() {
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'pharmacist';

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringBatchesList, setExpiringBatchesList] = useState<DrugBatch[]>([]);
  const [showExpiringPanel, setShowExpiringPanel] = useState(false);

  const [drugModal, setDrugModal] = useState<DrugModal>(null);
  const [stockInDrug, setStockInDrug] = useState<Drug | null>(null);
  const [stockOutDrug, setStockOutDrug] = useState<Drug | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchDrugs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchDrugs({
        name: search || undefined,
        stock: stockFilter.length === 0 ? undefined : stockFilter.join(','),
        page: 1,
        limit: 100,
        sort_by: sortBy || undefined,
        sort_dir: sortBy ? sortDir : undefined,
      });
      setDrugs(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter, sortBy, sortDir]);

  const fetchAlerts = useCallback(async () => {
    try {
      const [lowStockResult, expiringResult] = await Promise.all([
        lowStockAlerts(),
        expiringBatches(EXPIRING_DAYS),
      ]);
      setLowStockCount((lowStockResult.data ?? []).length);
      setExpiringBatchesList(expiringResult.data ?? []);
    } catch {
      setLowStockCount(0);
      setExpiringBatchesList([]);
    }
  }, []);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const refreshAll = async () => {
    await Promise.all([fetchDrugs(), fetchAlerts()]);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const hasActiveFilters = !!searchInput || stockFilter.length > 0;

  const handleResetFilters = () => {
    setSearchInput('');
    setStockFilter([]);
  };

  const toggleLowStockOnly = () => {
    setStockFilter(prev => (prev.length === 1 && prev[0] === 'low' ? [] : ['low']));
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Kho thuốc</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Danh mục thuốc, tồn kho theo lô/hạn sử dụng</p>
        </div>
        {canManage && (
          <Button onClick={() => setDrugModal({ mode: 'create' })} size="cta">
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Thêm thuốc
          </Button>
        )}
      </div>

      <InventoryTabs />

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <button type="button" onClick={toggleLowStockOnly} className="cursor-pointer border-none bg-transparent p-0 text-left">
          <StatCard
            label="Thuốc dưới định mức"
            value={lowStockCount}
            color="#dc3545"
            active={stockFilter.length === 1 && stockFilter[0] === 'low'}
          />
        </button>
        <button type="button" onClick={() => setShowExpiringPanel(v => !v)} className="cursor-pointer border-none bg-transparent p-0 text-left">
          <StatCard
            label={`Lô cận hạn (≤ ${EXPIRING_DAYS} ngày)`}
            value={expiringBatchesList.length}
            color="#ffc107"
            active={showExpiringPanel}
          />
        </button>
      </div>

      {showExpiringPanel && (
        <Card className="mb-5 gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
          {expiringBatchesList.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6c757d]">Không có lô nào sắp hết hạn.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                  <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thuốc</TableHead>
                  <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Số lô</TableHead>
                  <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Hạn sử dụng</TableHead>
                  <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Còn lại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringBatchesList.map(b => (
                  <TableRow key={b.ID} className="border-t border-[#f0f4f8]">
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{b.Drug?.Name ?? `#${b.DrugID}`}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-mono text-[#274760]">{b.LotNumber}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#dc3545]">{new Date(b.ExpiryDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{b.QuantityRemaining}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[360px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#adb5bd]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên thuốc…"
            className="h-auto rounded-xl border-[#dde2e8] py-3 pr-4 pl-10 text-[15px] text-[#274760]"
          />
        </div>
        <MultiSelect
          options={STOCK_STATUS_OPTIONS}
          selected={stockFilter}
          onChange={setStockFilter}
          placeholder="Tất cả tồn kho"
          className="w-[180px]"
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
        ) : drugs.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không tìm thấy thuốc nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="Tên thuốc" column="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Hoạt chất" column="active_ingredient" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Hàm lượng" column="strength" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Đơn vị" column="unit" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Giá" column="price" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Tồn kho" column="stock_quantity" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Định mức tối thiểu" column="min_stock_level" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                {canManage && <TableHead className="h-auto px-4 py-3"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drugs.map(d => {
                const isLow = d.MinStockLevel > 0 && d.StockQuantity < d.MinStockLevel;
                return (
                  <TableRow key={d.ID} className="border-t border-[#f0f4f8]">
                    <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">{d.Name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.ActiveIngredient || '—'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.Strength || '—'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.Unit}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.Price?.toLocaleString('vi-VN')} đ</TableCell>
                    <TableCell className={cn('px-4 py-3 text-sm font-semibold', isLow ? 'text-[#dc3545]' : 'text-[#274760]')}>
                      {d.StockQuantity}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.MinStockLevel}</TableCell>
                    {canManage && (
                      <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDrugModal({ mode: 'edit', drug: d })}
                          title="Sửa"
                          className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                        >
                          <Icon icon="fa6-solid:pen" className="text-[13px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStockInDrug(d)}
                          title="Nhập kho"
                          className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#198754]"
                        >
                          <Icon icon="fa6-solid:box-open" className="text-[13px]" />
                        </button>
                        {d.StockQuantity > 0 && (
                          <button
                            type="button"
                            onClick={() => setStockOutDrug(d)}
                            title="Xuất kho"
                            className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#307bc4]"
                          >
                            <Icon icon="fa6-solid:right-from-bracket" className="text-[13px]" />
                          </button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <DrugFormDialog
        open={!!drugModal}
        drug={drugModal?.mode === 'edit' ? drugModal.drug : null}
        onClose={() => setDrugModal(null)}
        onSaved={refreshAll}
      />
      <StockInDialog
        open={!!stockInDrug}
        drug={stockInDrug}
        onClose={() => setStockInDrug(null)}
        onSaved={refreshAll}
      />
      <StockOutDialog
        open={!!stockOutDrug}
        drug={stockOutDrug}
        onClose={() => setStockOutDrug(null)}
        onSaved={refreshAll}
      />
    </>
  );
}

function StatCard({ label, value, color, active }: { label: string; value: string | number; color: string; active?: boolean }) {
  return (
    <Card className="rounded-2xl border-[#e8edf2] px-5 py-4.5" style={active ? { borderColor: color, borderWidth: 2 } : undefined}>
      <div className="mb-1.5 text-xs font-bold tracking-wide text-[#6c757d] uppercase">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </Card>
  );
}
