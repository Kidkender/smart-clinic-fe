import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { getBedOccupancyReport, getClinicalReport } from '@/api/reports';
import { resolveError } from '@/utils/errorMessages';
import { encounterTypeLabel } from '@/utils/labels';
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

interface VisitPeriod {
  period: string;
  count: number;
}

interface VisitByType {
  type: string;
  count: number;
}

interface ClinicalReportData {
  total_visits: number;
  total_admissions: number;
  admission_rate: number;
  by_period: VisitPeriod[];
  by_type: VisitByType[];
}

interface WardOccupancy {
  ward_id: number;
  ward_name: string;
  total_beds: number;
  occupied: number;
  available: number;
  cleaning: number;
  occupancy_rate: number;
}

interface BedOccupancyData {
  wards: WardOccupancy[];
  total_beds: number;
  total_occupied: number;
  overall_occupancy_rate: number;
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

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ClinicalReport() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [report, setReport] = useState<ClinicalReportData | null>(null);
  const [occupancy, setOccupancy] = useState<BedOccupancyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const [clinicalResult, occupancyResult] = await Promise.all([
        getClinicalReport({ from, to, groupBy }),
        getBedOccupancyReport(),
      ]);
      setReport(clinicalResult.data ?? null);
      setOccupancy(occupancyResult.data ?? null);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

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
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Báo cáo chuyên môn</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Số lượt khám, tỷ lệ nhập viện và công suất sử dụng giường bệnh
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
      ) : (
        <>
          {report && (
            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Card className="rounded-2xl border-[#e8edf2] p-5">
                <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Tổng lượt khám</p>
                <p className="mt-1.5 mb-0 text-2xl font-bold text-[#274760]">{report.total_visits.toLocaleString('vi-VN')}</p>
              </Card>
              <Card className="rounded-2xl border-[#e8edf2] p-5">
                <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Số ca nhập viện</p>
                <p className="mt-1.5 mb-0 text-2xl font-bold text-[#274760]">{report.total_admissions.toLocaleString('vi-VN')}</p>
              </Card>
              <Card className="rounded-2xl border-[#e8edf2] p-5">
                <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Tỷ lệ nhập viện</p>
                <p className="mt-1.5 mb-0 text-2xl font-bold text-[#307bc4]">{percent(report.admission_rate)}</p>
              </Card>
              {occupancy && (
                <Card className="rounded-2xl border-[#e8edf2] p-5">
                  <p className="m-0 text-xs font-semibold tracking-wide text-[#6c757d] uppercase">Công suất giường hiện tại</p>
                  <p className="mt-1.5 mb-0 text-2xl font-bold text-[#ffc107]">{percent(occupancy.overall_occupancy_rate)}</p>
                  <p className="mt-1 mb-0 text-xs text-[#6c757d]">{occupancy.total_occupied}/{occupancy.total_beds} giường</p>
                </Card>
              )}
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] items-start gap-5">
            <Card className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Số lượt khám theo thời gian</h2>
              <BarChart
                data={report?.by_period ?? []}
                categoryKey="period"
                series={[{ key: 'count', label: 'Lượt khám', color: '#307bc4' }]}
                height={220}
              />
              {!report || report.by_period.length === 0 ? null : (
                <div className="mt-4 max-h-[280px] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#e8edf2] text-left text-xs text-[#6c757d]">
                        <th className="py-2 font-semibold">Kỳ</th>
                        <th className="py-2 text-right font-semibold">Số lượt khám</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.by_period.map(row => (
                        <tr key={row.period} className="border-b border-[#f0f4f8]">
                          <td className="py-2 text-[#274760]">{row.period}</td>
                          <td className="py-2 text-right font-semibold text-[#274760]">{row.count.toLocaleString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Cơ cấu lượt khám theo loại</h2>
              <BarChart
                data={(report?.by_type ?? []).map(row => ({ type: encounterTypeLabel(row.type), count: row.count }))}
                categoryKey="type"
                series={[{ key: 'count', label: 'Lượt khám', color: '#307bc4' }]}
                orientation="horizontal"
                height={(report?.by_type.length ?? 0) * 30}
              />
              {!report || report.by_type.length === 0 ? null : (
                <ul className="mt-4 flex list-none flex-col gap-2.5 p-0">
                  {report.by_type.map(row => (
                    <li key={row.type} className="flex items-center justify-between gap-2 border-b border-[#f0f4f8] pb-2.5">
                      <span className="text-sm text-[#274760]">{encounterTypeLabel(row.type)}</span>
                      <span className="text-sm font-semibold text-[#274760]">{row.count.toLocaleString('vi-VN')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
            <h2 className="m-0 mb-1 text-[17px] font-bold text-[#274760]">Công suất giường theo khu điều trị</h2>
            <p className="m-0 mb-4 text-xs text-[#6c757d]">Số liệu thời gian thực, không phụ thuộc khoảng thời gian lọc ở trên.</p>
            <BarChart
              data={(occupancy?.wards ?? []).map(ward => ({
                ward: ward.ward_name,
                occupied: ward.occupied,
                available: ward.available,
                cleaning: ward.cleaning,
              }))}
              categoryKey="ward"
              series={[
                { key: 'occupied', label: 'Đang sử dụng', color: '#307bc4' },
                { key: 'available', label: 'Trống', color: '#28a745' },
                { key: 'cleaning', label: 'Đang vệ sinh', color: '#6c757d' },
              ]}
              orientation="horizontal"
              height={(occupancy?.wards.length ?? 0) * 90}
            />
            {!occupancy || occupancy.wards.length === 0 ? null : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e8edf2] text-left text-xs text-[#6c757d]">
                      <th className="py-2 font-semibold">Khu điều trị</th>
                      <th className="py-2 text-right font-semibold">Đang sử dụng</th>
                      <th className="py-2 text-right font-semibold">Trống</th>
                      <th className="py-2 text-right font-semibold">Đang vệ sinh</th>
                      <th className="py-2 text-right font-semibold">Công suất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancy.wards.map(ward => (
                      <tr key={ward.ward_id} className="border-b border-[#f0f4f8]">
                        <td className="py-2 text-[#274760]">{ward.ward_name}</td>
                        <td className="py-2 text-right text-[#274760]">{ward.occupied}</td>
                        <td className="py-2 text-right text-[#28a745]">{ward.available}</td>
                        <td className="py-2 text-right text-[#6c757d]">{ward.cleaning}</td>
                        <td className="py-2 text-right font-semibold text-[#307bc4]">{percent(ward.occupancy_rate)}</td>
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
