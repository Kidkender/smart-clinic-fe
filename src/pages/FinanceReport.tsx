import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { getRevenueReport } from '@/api/reports';
import { resolveError } from '@/utils/errorMessages';
import { invoiceItemCategoryLabel, payerTypeLabel } from '@/utils/labels';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import BarChart from '@/components/charts/BarChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RevenuePeriod {
  period: string;
  cash_in: number;
  cash_out: number;
  net_revenue: number;
}

interface RevenueByCategory {
  category: string;
  amount: number;
}

interface PayerOutstanding {
  payer_id: number;
  payer_name: string;
  payer_type: string;
  amount: number;
}

interface RevenueReport {
  total_cash_in: number;
  total_cash_out: number;
  total_net_revenue: number;
  outstanding_total: number;
  by_period: RevenuePeriod[];
  by_category: RevenueByCategory[];
  payer_outstanding: PayerOutstanding[];
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

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export default function FinanceReport() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const result = await getRevenueReport({ from, to, groupBy });
      setReport(result.data ?? null);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <>
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#307bc4] no-underline">
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Bảng điều khiển
      </Link>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Báo cáo tài chính</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Thống kê tiền vào (thanh toán), tiền ra (hoàn tiền) và công nợ hiện tại
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <DatePicker value={from} onChange={setFrom} max={to} className="w-[150px]" />
          <span className="text-sm text-[#6c757d]">đến</span>
          <DatePicker value={to} onChange={setTo} min={from} className="w-[150px]" />
          <Select value={groupBy} onValueChange={value => setGroupBy(value as 'day' | 'month')}>
            <SelectTrigger className="h-auto w-[140px] rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Theo ngày</SelectItem>
              <SelectItem value="month">Theo tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : !report ? null : (
        <>
          <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Card className="rounded-2xl border-[#e8edf2] p-5">
              <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Tiền vào</p>
              <p className="mt-1.5 mb-0 text-2xl font-bold text-[#28a745]">{money(report.total_cash_in)}</p>
            </Card>
            <Card className="rounded-2xl border-[#e8edf2] p-5">
              <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Tiền ra (hoàn)</p>
              <p className="mt-1.5 mb-0 text-2xl font-bold text-[#dc3545]">{money(report.total_cash_out)}</p>
            </Card>
            <Card className="rounded-2xl border-[#e8edf2] p-5">
              <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Doanh thu ròng</p>
              <p className="mt-1.5 mb-0 text-2xl font-bold text-[#274760]">{money(report.total_net_revenue)}</p>
            </Card>
            <Card className="rounded-2xl border-[#e8edf2] p-5">
              <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Công nợ chưa thu</p>
              <p className="mt-1.5 mb-0 text-2xl font-bold text-[#ffc107]">{money(report.outstanding_total)}</p>
            </Card>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] items-start gap-5">
            <Card className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Dòng tiền theo thời gian</h2>
              <BarChart
                data={report.by_period}
                categoryKey="period"
                series={[
                  { key: 'cash_in', label: 'Tiền vào', color: '#28a745' },
                  { key: 'cash_out', label: 'Tiền ra', color: '#dc3545' },
                ]}
                valueFormatter={money}
                height={220}
              />
              {report.by_period.length === 0 ? null : (
                <div className="mt-4 max-h-[280px] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#e8edf2] text-left text-xs text-[#6c757d]">
                        <th className="py-2 font-semibold">Kỳ</th>
                        <th className="py-2 text-right font-semibold">Vào</th>
                        <th className="py-2 text-right font-semibold">Ra</th>
                        <th className="py-2 text-right font-semibold">Ròng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.by_period.map(row => (
                        <tr key={row.period} className="border-b border-[#f0f4f8]">
                          <td className="py-2 text-[#274760]">{row.period}</td>
                          <td className="py-2 text-right text-[#28a745]">{money(row.cash_in)}</td>
                          <td className="py-2 text-right text-[#dc3545]">{money(row.cash_out)}</td>
                          <td className="py-2 text-right font-semibold text-[#274760]">{money(row.net_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Doanh thu theo loại phí</h2>
              <BarChart
                data={report.by_category.map(row => ({ category: invoiceItemCategoryLabel(row.category), amount: row.amount }))}
                categoryKey="category"
                series={[{ key: 'amount', label: 'Doanh thu', color: '#307bc4' }]}
                orientation="horizontal"
                valueFormatter={money}
                height={report.by_category.length * 30}
              />
              {report.by_category.length === 0 ? null : (
                <ul className="mt-4 flex list-none flex-col gap-2.5 p-0">
                  {report.by_category.map(row => (
                    <li key={row.category} className="flex items-center justify-between gap-2 border-b border-[#f0f4f8] pb-2.5">
                      <span className="text-sm text-[#274760]">{invoiceItemCategoryLabel(row.category)}</span>
                      <span className="text-sm font-semibold text-[#274760]">{money(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
            <h2 className="m-0 mb-1 text-[17px] font-bold text-[#274760]">Công nợ theo bảo hiểm</h2>
            <p className="m-0 mb-4 text-xs text-[#6c757d]">
              Các khoản BHYT/bảo hiểm tư nhân đã duyệt (hoặc đang chờ duyệt) nhưng chưa ghi nhận thanh toán — không phụ thuộc khoảng thời gian lọc ở trên.
            </p>
            {report.payer_outstanding.length === 0 ? (
              <p className="text-sm text-[#6c757d]">Không có khoản công nợ bảo hiểm nào chưa thu.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {report.payer_outstanding.map(row => (
                  <li key={row.payer_id} className="flex items-center justify-between gap-2 border-b border-[#f0f4f8] pb-2.5">
                    <div>
                      <span className="text-sm font-medium text-[#274760]">{row.payer_name}</span>
                      <span className="ml-2 text-xs text-[#6c757d]">{payerTypeLabel(row.payer_type)}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#ffc107]">{money(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}
