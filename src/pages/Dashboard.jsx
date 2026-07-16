import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/labels';

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>
        Bảng điều khiển
      </h1>
      <p style={{ color: '#6c757d', marginTop: '4px', fontSize: '15px' }}>
        Đăng nhập với vai trò: <strong>{roleLabel(role)}</strong>
      </p>
    </div>
  );
}
