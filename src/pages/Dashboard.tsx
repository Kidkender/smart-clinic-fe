import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/utils/labels';

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <div>
      <h1 className="m-0 text-[26px] font-bold text-[#274760]">Bảng điều khiển</h1>
      <p className="mt-1 text-[15px] text-[#6c757d]">
        Đăng nhập với vai trò: <strong>{roleLabel(role)}</strong>
      </p>
    </div>
  );
}
