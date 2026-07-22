import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { listUsers, updateUserRole, updateUserStatus } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { roleLabel, userStatusLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  ID: number | string;
  Fullname: string;
  Email: string;
  Role: string;
  Status: string;
  CreatedAt?: string;
}

const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'cashier', 'lab_tech', 'radiology_tech'];

export default function Users() {
  const { userId } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listUsers(statusFilter === 'all' ? undefined : statusFilter);
      setUsers(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleActivate = async (user: User) => {
    const isUnlock = user.Status === 'locked';
    const message = isUnlock
      ? `Mở khóa tài khoản "${user.Fullname}" (${user.Email})?`
      : `Duyệt tài khoản "${user.Fullname}" (${user.Email})?`;
    if (!(await confirm(message, { danger: false, confirmLabel: isUnlock ? 'Mở khóa' : 'Duyệt' }))) return;
    setBusyId(user.ID);
    setError('');
    try {
      await updateUserStatus(user.ID, 'active');
      await fetchUsers();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleLock = async (user: User) => {
    if (!(await confirm(`Khóa tài khoản "${user.Fullname}" (${user.Email})?`))) return;
    setBusyId(user.ID);
    setError('');
    try {
      await updateUserStatus(user.ID, 'locked');
      await fetchUsers();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (user: User, role: string) => {
    if (role === user.Role) return;
    if (!(await confirm(`Đổi vai trò của "${user.Fullname}" thành "${roleLabel(role)}"?`, { danger: false, confirmLabel: 'Đổi vai trò' }))) return;
    setBusyId(user.ID);
    setError('');
    try {
      await updateUserRole(user.ID, role);
      await fetchUsers();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Nhân viên</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Duyệt tài khoản đăng ký mới và quản lý vai trò nhân viên
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-auto w-55 rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Đang chờ duyệt</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="locked">Đã khóa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : users.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:user-check" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">
              {statusFilter === 'pending' ? 'Không có tài khoản nào đang chờ duyệt' : 'Không có nhân viên nào phù hợp'}
            </h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Nhân viên</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Vai trò</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ngày đăng ký</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm">
                    <div className="font-semibold text-[#274760]">{user.Fullname}</div>
                    <div className="text-[13px] text-[#6c757d]">{user.Email}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <Select
                      value={user.Role}
                      onValueChange={value => handleRoleChange(user, value)}
                      disabled={busyId === user.ID || String(user.ID) === String(userId)}
                    >
                      <SelectTrigger className="h-auto w-[170px] rounded-xl border-[#dde2e8] px-3 py-2 text-sm text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <Badge variant={user.Status === 'active' ? 'secondary' : user.Status === 'locked' ? 'destructive' : 'outline'}>
                      {userStatusLabel(user.Status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                    {user.Status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleLock(user)}
                        disabled={busyId === user.ID || String(user.ID) === String(userId)}
                        title={String(user.ID) === String(userId) ? 'Không thể tự khóa tài khoản của chính mình' : 'Khóa tài khoản'}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#dc3545]/30 bg-white px-4 py-2 text-[13px] font-semibold text-[#dc3545] disabled:opacity-50"
                      >
                        <Icon icon="fa6-solid:lock" className="text-[12px]" />Khóa
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivate(user)}
                        disabled={busyId === user.ID}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#307bc4] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                      >
                        <Icon icon={user.Status === 'locked' ? 'fa6-solid:unlock' : 'fa6-solid:check'} className="text-[12px]" />
                        {user.Status === 'locked' ? 'Mở khóa' : 'Duyệt'}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {ConfirmDialog}
    </>
  );
}
