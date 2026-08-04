import { NavLink } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { to: '/medical-supplies', label: 'Danh mục & tồn kho', icon: 'fa6-solid:boxes-stacked', end: true, roles: ['admin', 'pharmacist'] },
  { to: '/medical-supplies/transactions', label: 'Xuất-nhập kho', icon: 'fa6-solid:right-left', end: true, roles: ['admin', 'pharmacist'] },
  { to: '/medical-supplies/usages', label: 'Sử dụng cho bệnh nhân', icon: 'fa6-solid:kit-medical', end: true, roles: ['admin', 'doctor', 'nurse', 'pharmacist'] },
  { to: '/medical-supplies/stock-audits', label: 'Kiểm kê kho', icon: 'fa6-solid:clipboard-check', end: false, roles: ['admin', 'pharmacist'] },
];

export default function MedicalSupplyTabs() {
  const { role } = useAuth();
  const visibleTabs = TABS.filter(tab => role != null && tab.roles.includes(role));

  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[#e8edf2] bg-[#f4f7fa] p-1.5">
      {visibleTabs.map(tab => (
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
