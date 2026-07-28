import { NavLink } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/pharmacy/worklist', label: 'Ngoại trú', icon: 'fa6-solid:prescription-bottle-medical', end: true },
  { to: '/pharmacy/ward-issues', label: 'Nội trú', icon: 'fa6-solid:pills', end: true },
];

export default function PharmacyTabs() {
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
