import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/utils/labels';
import { cn } from '@/lib/utils';
import useConfirm from '@/hooks/useConfirm';
import NotificationBell from '@/components/NotificationBell';
import ChatWidget from '@/components/chat/ChatWidget';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  roles?: string[];
  matchPrefix?: string;
};

function isNavItemActive(item: NavItem, pathname: string): boolean {
  const base = item.matchPrefix ?? item.to;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa6-solid:gauge' },
  { to: '/chat', label: 'Trò chuyện', icon: 'fa6-solid:comments' },
  { to: '/patients', label: 'Bệnh nhân', icon: 'fa6-solid:user-injured' },
  { to: '/appointments', label: 'Lịch hẹn', icon: 'fa6-solid:calendar-days' },
  { to: '/queue', label: 'Hàng đợi', icon: 'fa6-solid:list-ol' },
  { to: '/admissions', label: 'Nội trú', icon: 'fa6-solid:bed-pulse', roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { to: '/lab-worklist', label: 'Hàng đợi xét nghiệm', icon: 'fa6-solid:flask-vial', roles: ['admin', 'lab_tech', 'nurse', 'doctor'] },
  { to: '/imaging-worklist', label: 'Hàng đợi CĐHA', icon: 'fa6-solid:x-ray', roles: ['admin', 'radiology_tech', 'doctor'] },
  { to: '/pharmacy/worklist', label: 'Cấp thuốc', icon: 'fa6-solid:prescription-bottle-medical', roles: ['admin', 'pharmacist'], matchPrefix: '/pharmacy' },
  { to: '/departments', label: 'Khoa', icon: 'fa6-solid:sitemap', roles: ['admin'] },
  { to: '/rooms', label: 'Phòng khám/ĐT', icon: 'fa6-solid:door-open', roles: ['admin'] },
  { to: '/lab-tests', label: 'Danh mục xét nghiệm', icon: 'fa6-solid:vial', roles: ['admin', 'lab_tech'] },
  { to: '/imaging-procedures', label: 'Danh mục CĐHA', icon: 'fa6-solid:radiation', roles: ['admin', 'radiology_tech'] },
  { to: '/wards', label: 'Khu điều trị & Giường', icon: 'fa6-solid:hospital-user', roles: ['admin'] },
  { to: '/surgeries', label: 'Lịch mổ', icon: 'fa6-solid:user-doctor', roles: ['admin', 'doctor', 'nurse'] },
  { to: '/operating-rooms', label: 'Danh mục phòng mổ', icon: 'fa6-solid:door-closed', roles: ['admin'] },
  { to: '/invoices', label: 'Hóa đơn viện phí', icon: 'fa6-solid:file-invoice', roles: ['admin', 'cashier', 'receptionist'] },
  { to: '/payers', label: 'Bảo lãnh & Công nợ', icon: 'fa6-solid:file-invoice-dollar', roles: ['admin', 'cashier', 'receptionist'] },
  // Tạm ẩn "Báo cáo tài chính" khỏi sidebar — route /finance-report vẫn còn, chỉ bỏ nav item.
  { to: '/fee-settings', label: 'Cấu hình viện phí', icon: 'fa6-solid:sliders', roles: ['admin', 'cashier', 'receptionist'] },
  { to: '/inventory', label: 'Kho thuốc', icon: 'fa6-solid:boxes-stacked', roles: ['admin', 'pharmacist'] },
  { to: '/medical-supplies/usages', label: 'Vật tư y tế', icon: 'fa6-solid:kit-medical', roles: ['admin', 'doctor', 'nurse', 'pharmacist'], matchPrefix: '/medical-supplies' },
  { to: '/doctors', label: 'Bác sĩ', icon: 'fa6-solid:user-doctor', roles: ['admin'] },
  { to: '/doctor-schedules', label: 'Lịch làm việc BS', icon: 'fa6-solid:calendar-check', roles: ['admin'] },
  { to: '/employees', label: 'Nhân sự', icon: 'fa6-solid:business-time', roles: ['admin'] },
  { to: '/users', label: 'Tài khoản', icon: 'fa6-solid:user-check', roles: ['admin'] },
  { to: '/audit-logs', label: 'Nhật ký hệ thống', icon: 'fa6-solid:clock-rotate-left', roles: ['admin'] },
  // Tạm ẩn "Nhật ký email" khỏi sidebar — route /email-logs vẫn còn, chỉ bỏ nav item.
];

export default function AdminLayout() {
  const { role, fullname, email, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [confirm, ConfirmDialog] = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm('Bạn có chắc chắn muốn đăng xuất?', { title: 'Đăng xuất' });
    if (!ok) return;
    logout();
    navigate('/login', { viewTransition: true });
  };

  const visibleNav = NAV.filter(item => !item.roles || (role != null && item.roles.includes(role)));

  const avatarInitial = (fullname || role || 'U').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f4f7fa]">
      <aside className="fixed top-0 left-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto bg-[#1c3a52] text-white">
        <div className="border-b border-white/10 px-6 pt-7 pb-5">
          <Link to="/dashboard" className="no-underline">
            <div className="flex items-center gap-2.5">
              <Icon icon="fa6-solid:hospital" className="text-[22px] text-[#63c4ff]" />
              <span className="text-lg font-bold tracking-tight text-white">SmartClinic</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4">
          {visibleNav.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'mb-1 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[15px] font-medium no-underline transition-colors',
                isNavItemActive(item, location.pathname) ? 'bg-white/14 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon icon={item.icon} className="text-base" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <Link
            to="/profile"
            title="Xem hồ sơ cá nhân"
            className="mb-2 flex items-center gap-2.5 rounded-lg px-3.5 py-2 no-underline hover:bg-white/8"
          >
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
              {avatarInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {fullname ?? (role ? roleLabel(role) : 'Người dùng')}
              </div>
              <div className="truncate text-[11px] text-white/50">
                {email ?? (role ? roleLabel(role) : '')}
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-white/8 px-3.5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/12 hover:text-white"
          >
            <Icon icon="fa6-solid:right-from-bracket" className="text-sm" />
            Đăng xuất
          </button>
          <div className="mt-3 text-center text-[11px] text-white/35">SmartClinic v{__APP_VERSION__}</div>
        </div>
      </aside>

      <div className="ml-60 flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end border-b border-[#e8edf2] bg-white px-8">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {ConfirmDialog}
      <ChatWidget />
    </div>
  );
}
