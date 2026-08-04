import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/utils/labels';
import { Card } from '@/components/ui/card';
import { getBedOccupancyReport, getClinicalReport, getDashboardAlerts, getRevenueReport, getTopDrugsReport } from '@/api/reports';
import { expiringBatches } from '@/api/inventory';

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface Trend {
  percent: number;
}

// Yesterday can legitimately be 0 (no revenue at all) — reporting "+100%"
// off a zero base is misleading, not informative, so that case renders no
// trend at all rather than an inflated number.
function computeTrend(today: number | null, yesterday: number | null): Trend | null {
  if (today == null || yesterday == null || yesterday === 0) return null;
  return { percent: ((today - yesterday) / yesterday) * 100 };
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  accent: string;
  trend?: Trend | null;
}

function StatCard({ label, value, icon, accent, trend }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-[#e8edf2] p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon icon={icon} />
        </div>
        <div className="min-w-0">
          <p className="m-0 truncate text-xs font-semibold tracking-wide text-[#6c757d] uppercase">{label}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="m-0 truncate text-xl font-bold text-[#274760]">{value}</p>
            {trend && (
              <span
                className={`flex shrink-0 items-center gap-0.5 text-xs font-semibold ${trend.percent >= 0 ? 'text-[#28a745]' : 'text-[#dc3545]'}`}
              >
                <Icon icon={trend.percent >= 0 ? 'fa6-solid:arrow-up' : 'fa6-solid:arrow-down'} className="text-[9px]" />
                {Math.abs(trend.percent).toFixed(0)}%
              </span>
            )}
          </div>
          {trend && <p className="m-0 text-[10px] text-[#adb5bd]">so với hôm qua</p>}
        </div>
      </div>
    </Card>
  );
}

function DashboardSection({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="m-0 text-[17px] font-bold text-[#274760]">{title}</h2>
        <Link to={to} className="text-sm font-medium text-[#307bc4] no-underline hover:underline">
          Xem chi tiết →
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">{children}</div>
    </div>
  );
}

interface DashboardAlerts {
  unallocated_invoices: number;
  no_show_appointments_today: number;
  prescriptions_awaiting_pickup: number;
}

export default function Dashboard() {
  const { role, fullname } = useAuth();
  const today = toIsoDate(new Date());
  const yesterday = toIsoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const canSeeFinance = role === 'admin' || role === 'cashier';
  const canSeeClinical = role === 'admin' || role === 'doctor' || role === 'nurse';
  const canSeeInventory = role === 'admin' || role === 'pharmacist';
  const canSeeAlerts = canSeeFinance || canSeeClinical || canSeeInventory;

  const [revenueToday, setRevenueToday] = useState<number | null>(null);
  const [revenueYesterday, setRevenueYesterday] = useState<number | null>(null);
  const [clinical, setClinical] = useState<{ total_visits: number; total_admissions: number } | null>(null);
  const [visitsYesterday, setVisitsYesterday] = useState<number | null>(null);
  const [occupancyRate, setOccupancyRate] = useState<number | null>(null);
  const [topDrug, setTopDrug] = useState<string | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);

  useEffect(() => {
    if (!canSeeFinance) return;
    getRevenueReport({ from: today, to: today, groupBy: 'day' })
      .then(result => setRevenueToday(result.data?.total_cash_in ?? 0))
      .catch(() => setRevenueToday(null));
    getRevenueReport({ from: yesterday, to: yesterday, groupBy: 'day' })
      .then(result => setRevenueYesterday(result.data?.total_cash_in ?? 0))
      .catch(() => setRevenueYesterday(null));
  }, [canSeeFinance, today, yesterday]);

  useEffect(() => {
    if (!canSeeClinical) return;
    getClinicalReport({ from: today, to: today, groupBy: 'day' })
      .then(result => setClinical(result.data ?? null))
      .catch(() => setClinical(null));
    getClinicalReport({ from: yesterday, to: yesterday, groupBy: 'day' })
      .then(result => setVisitsYesterday(result.data?.total_visits ?? 0))
      .catch(() => setVisitsYesterday(null));
    getBedOccupancyReport()
      .then(result => setOccupancyRate(result.data?.overall_occupancy_rate ?? null))
      .catch(() => setOccupancyRate(null));
  }, [canSeeClinical, today, yesterday]);

  useEffect(() => {
    if (!canSeeInventory) return;
    getTopDrugsReport({ from: today, to: today, limit: 1 })
      .then(result => setTopDrug(result.data?.items?.[0]?.drug_name ?? 'Chưa có dữ liệu'))
      .catch(() => setTopDrug(null));
    expiringBatches(30)
      .then(result => setExpiringCount(result.data?.length ?? 0))
      .catch(() => setExpiringCount(null));
  }, [canSeeInventory, today]);

  useEffect(() => {
    if (!canSeeAlerts) return;
    getDashboardAlerts()
      .then(result => setAlerts(result.data ?? null))
      .catch(() => setAlerts(null));
  }, [canSeeAlerts]);

  return (
    <div>
      <h1 className="m-0 text-[26px] font-bold text-[#274760]">Bảng điều khiển</h1>
      <p className="mt-1 mb-6 text-[15px] text-[#6c757d]">
        Chào mừng trở lại, <strong>{fullname || roleLabel(role)}</strong>
      </p>

      {canSeeAlerts && alerts && (
        <div className="mb-6">
          <h2 className="m-0 mb-3 text-[17px] font-bold text-[#274760]">Cần xử lý</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {canSeeFinance && (
              <StatCard
                label="Hóa đơn chưa phân bổ"
                value={alerts.unallocated_invoices.toLocaleString('vi-VN')}
                icon="fa6-solid:file-invoice-dollar"
                accent={alerts.unallocated_invoices > 0 ? '#dc3545' : '#28a745'}
              />
            )}
            {canSeeClinical && (
              <StatCard
                label="Lịch hẹn no-show hôm nay"
                value={alerts.no_show_appointments_today.toLocaleString('vi-VN')}
                icon="fa6-solid:calendar-xmark"
                accent={alerts.no_show_appointments_today > 0 ? '#dc3545' : '#28a745'}
              />
            )}
            {canSeeInventory && (
              <StatCard
                label="Đơn thuốc chờ lấy quá 24h"
                value={alerts.prescriptions_awaiting_pickup.toLocaleString('vi-VN')}
                icon="fa6-solid:prescription-bottle"
                accent={alerts.prescriptions_awaiting_pickup > 0 ? '#dc3545' : '#28a745'}
              />
            )}
          </div>
        </div>
      )}

      {canSeeClinical && (
        <DashboardSection title="Chuyên môn hôm nay" to="/clinical-report">
          <StatCard
            label="Lượt khám hôm nay"
            value={clinical ? clinical.total_visits.toLocaleString('vi-VN') : '—'}
            icon="fa6-solid:user-injured"
            accent="#307bc4"
            trend={computeTrend(clinical?.total_visits ?? null, visitsYesterday)}
          />
          <StatCard
            label="Ca nhập viện hôm nay"
            value={clinical ? clinical.total_admissions.toLocaleString('vi-VN') : '—'}
            icon="fa6-solid:bed-pulse"
            accent="#8e5bd6"
          />
          <StatCard
            label="Công suất giường"
            value={occupancyRate != null ? percent(occupancyRate) : '—'}
            icon="fa6-solid:hospital-user"
            accent="#ffc107"
          />
        </DashboardSection>
      )}

      {canSeeFinance && (
        <DashboardSection title="Tài chính hôm nay" to="/finance-report">
          <StatCard
            label="Doanh thu hôm nay"
            value={revenueToday != null ? money(revenueToday) : '—'}
            icon="fa6-solid:sack-dollar"
            accent="#28a745"
            trend={computeTrend(revenueToday, revenueYesterday)}
          />
        </DashboardSection>
      )}

      {canSeeInventory && (
        <DashboardSection title="Kho thuốc" to="/inventory-report">
          <StatCard
            label="Thuốc bán chạy hôm nay"
            value={topDrug ?? '—'}
            icon="fa6-solid:prescription-bottle-medical"
            accent="#307bc4"
          />
          <StatCard
            label="Lô sắp hết hạn (30 ngày)"
            value={expiringCount != null ? expiringCount.toLocaleString('vi-VN') : '—'}
            icon="fa6-solid:triangle-exclamation"
            accent="#dc3545"
          />
        </DashboardSection>
      )}
    </div>
  );
}
