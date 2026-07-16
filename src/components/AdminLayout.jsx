import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/labels';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa6-solid:gauge' },
  { to: '/patients', label: 'Bệnh nhân', icon: 'fa6-solid:user-injured' },
  { to: '/appointments', label: 'Lịch hẹn', icon: 'fa6-solid:calendar-days' },
  { to: '/queue', label: 'Hàng đợi', icon: 'fa6-solid:list-ol' },
  { to: '/departments', label: 'Khoa/Phòng', icon: 'fa6-solid:sitemap', roles: ['admin'] },
  { to: '/doctor-schedules', label: 'Lịch làm việc BS', icon: 'fa6-solid:user-doctor', roles: ['admin'] },
];

export default function AdminLayout() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = NAV.filter(item => !item.roles || item.roles.includes(role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7fa' }}>
      <aside style={{
        width: '240px', background: '#1c3a52', color: '#fff',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon icon="fa6-solid:hospital" style={{ fontSize: '22px', color: '#63c4ff' }} />
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' }}>
                SmartClinic
              </span>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {visibleNav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '11px 14px', borderRadius: '10px', marginBottom: '4px',
                textDecoration: 'none', fontSize: '15px', fontWeight: '500',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon icon={icon} style={{ fontSize: '16px' }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '8px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', color: '#fff', fontWeight: '600', flexShrink: 0,
            }}>
              {(role || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                {role ? roleLabel(role) : 'Người dùng'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 14px', border: 'none', borderRadius: '10px',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer', fontSize: '14px', fontWeight: '500',
            }}
          >
            <Icon icon="fa6-solid:right-from-bracket" style={{ fontSize: '14px' }} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: '240px' }}>
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
