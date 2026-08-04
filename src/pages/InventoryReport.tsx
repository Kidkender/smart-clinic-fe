import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { getInventoryMovementReport, getTopDrugsReport } from '@/api/reports';
import { expiringBatches } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import BarChart from '@/components/charts/BarChart';
import type { DrugBatch } from '@/components/inventory/types';

interface DrugMovement {
  drug_id: number;
  drug_name: string;
  unit: string;
  total_in: number;
  total_out: number;
  net_change: number;
}

interface InventoryMovementData {
  by_drug: DrugMovement[];
  total_in: number;
  total_out: number;
}

interface TopDrugItem {
  drug_id: number;
  drug_name: string;
  unit: string;
  quantity_dispensed: number;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export default function InventoryReport() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const [movement, setMovement] = useState<InventoryMovementData | null>(null);
  const [topDrugs, setTopDrugs] = useState<TopDrugItem[]>([]);
  const [expiring, setExpiring] = useState<DrugBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const [movementResult, topDrugsResult, expiringResult] = await Promise.all([
        getInventoryMovementReport({ from, to }),
        getTopDrugsReport({ from, to, limit: 10 }),
        expiringBatches(30),
      ]);
      setMovement(movementResult.data ?? null);
      setTopDrugs(topDrugsResult.data?.items ?? []);
      setExpiring(expiringResult.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#307bc4] no-underline">
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Bảng điều khiển
      </Link>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Báo cáo kho</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Xuất - nhập kho, thuốc bán chạy và thuốc sắp hết hạn sử dụng
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <DatePicker value={from} onChange={setFrom} max={to} className="w-[150px]" />
          <span className="text-sm text-[#6c757d]">đến</span>
          <DatePicker value={to} onChange={setTo} min={from} className="w-[150px]" />
        </div>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : (
        <>
          {movement && (
            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Card className="rounded-2xl border-[#e8edf2] p-5">
                <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Tổng nhập kho</p>
                <p className="mt-1.5 mb-0 text-2xl font-bold text-[#28a745]">{movement.total_in.toLocaleString('vi-VN')}</p>
              </Card>
              <Card className="rounded-2xl border-[#e8edf2] p-5">
                <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Tổng xuất kho</p>
                <p className="mt-1.5 mb-0 text-2xl font-bold text-[#dc3545]">{movement.total_out.toLocaleString('vi-VN')}</p>
              </Card>
              <Card className="rounded-2xl border-[#e8edf2] p-5">
                <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Thuốc sắp hết hạn (30 ngày)</p>
                <p className="mt-1.5 mb-0 text-2xl font-bold text-[#ffc107]">{expiring.length}</p>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] items-start gap-5">
            <Card className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Xuất - nhập theo thuốc</h2>
              <BarChart
                data={(movement?.by_drug ?? []).map(row => ({ drug: row.drug_name, total_in: row.total_in, total_out: row.total_out }))}
                categoryKey="drug"
                series={[
                  { key: 'total_in', label: 'Nhập', color: '#28a745' },
                  { key: 'total_out', label: 'Xuất', color: '#dc3545' },
                ]}
                orientation="horizontal"
              />
              {!movement || movement.by_drug.length === 0 ? null : (
                <div className="mt-4 max-h-[280px] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#e8edf2] text-left text-xs text-[#6c757d]">
                        <th className="py-2 font-semibold">Thuốc</th>
                        <th className="py-2 text-right font-semibold">Nhập</th>
                        <th className="py-2 text-right font-semibold">Xuất</th>
                        <th className="py-2 text-right font-semibold">Chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movement.by_drug.map(row => (
                        <tr key={row.drug_id} className="border-b border-[#f0f4f8]">
                          <td className="py-2 text-[#274760]">{row.drug_name}</td>
                          <td className="py-2 text-right text-[#28a745]">{row.total_in}</td>
                          <td className="py-2 text-right text-[#dc3545]">{row.total_out}</td>
                          <td className="py-2 text-right font-semibold text-[#274760]">{row.net_change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Thuốc bán chạy</h2>
              <BarChart
                data={topDrugs.map(row => ({ drug: row.drug_name, quantity: row.quantity_dispensed }))}
                categoryKey="drug"
                series={[{ key: 'quantity', label: 'Số lượng cấp phát', color: '#307bc4' }]}
                orientation="horizontal"
              />
              {topDrugs.length === 0 ? null : (
                <ul className="mt-4 flex list-none flex-col gap-2.5 p-0">
                  {topDrugs.map((row, index) => (
                    <li key={row.drug_id} className="flex items-center justify-between gap-2 border-b border-[#f0f4f8] pb-2.5">
                      <span className="text-sm text-[#274760]">
                        <span className="mr-2 text-xs text-[#6c757d]">#{index + 1}</span>
                        {row.drug_name}
                      </span>
                      <span className="text-sm font-semibold text-[#274760]">
                        {row.quantity_dispensed.toLocaleString('vi-VN')} {row.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
            <h2 className="m-0 mb-1 text-[17px] font-bold text-[#274760]">Thuốc sắp hết hạn sử dụng</h2>
            <p className="m-0 mb-4 text-xs text-[#6c757d]">Các lô còn tồn kho, hết hạn trong 30 ngày tới — không phụ thuộc khoảng thời gian lọc ở trên.</p>
            {expiring.length === 0 ? (
              <p className="text-sm text-[#6c757d]">Không có lô thuốc nào sắp hết hạn.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e8edf2] text-left text-xs text-[#6c757d]">
                      <th className="py-2 font-semibold">Thuốc</th>
                      <th className="py-2 font-semibold">Số lô</th>
                      <th className="py-2 text-right font-semibold">Tồn còn lại</th>
                      <th className="py-2 text-right font-semibold">Hạn sử dụng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiring.map(batch => (
                      <tr key={batch.ID} className="border-b border-[#f0f4f8]">
                        <td className="py-2 text-[#274760]">{batch.Drug?.Name ?? '—'}</td>
                        <td className="py-2 text-[#6c757d]">{batch.LotNumber}</td>
                        <td className="py-2 text-right text-[#274760]">
                          {batch.QuantityRemaining} {batch.Drug?.Unit ?? ''}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className="border-[#ffc107]/40 bg-[#ffc107]/10 text-[#a1720b]">
                            {new Date(batch.ExpiryDate).toLocaleDateString('vi-VN')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
