import { NavLink } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/medical-supplies', label: 'Danh mục & tồn kho', icon: 'fa6-solid:boxes-stacked', end: true },
  { to: '/medical-supplies/transactions', label: 'Xuất-nhập kho', icon: 'fa6-solid:right-left', end: true },
  { to: '/medical-supplies/usages', label: 'Sử dụng cho bệnh nhân', icon: 'fa6-solid:kit-medical', end: true },
  { to: '/medical-supplies/stock-audits', label: 'Kiểm kê kho', icon: 'fa6-solid:clipboard-check', end: false },
];

export default function MedicalSupplyTabs() {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[#e8edf2] bg-[#f4f7fa] p-1.5">
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold no-underline transition-colors',
            isActive ? 'bg-white text-[#307bc4] shadow-sm' : 'text-[#6c757d] hover:text-[#274760]',
          )}
        >
          <Icon icon={tab.icon} className="text-xs" />
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
