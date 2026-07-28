import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listUsers, updateUserRole, updateUserStatus, createUser } from '@/api/auth';
import { getDepartments } from '@/api/department';
import { resolveError } from '@/utils/errorMessages';
import { roleLabel, userStatusLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { staffCreateSchema, type StaffCreateFormValues } from '@/schemas/staff';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import FieldError from '@/components/FieldError';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SortableTableHead from '@/components/ui/sortable-table-head';

interface Department {
  ID: number | string;
  Name: string;
}

interface User {
  ID: number | string;
  Fullname: string;
  Email: string;
  Role: string;
  Status: string;
  CreatedAt?: string;
}

const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'cashier', 'lab_tech', 'radiology_tech'];
const STAFF_ROLES = ['admin', 'nurse', 'receptionist', 'pharmacist', 'cashier', 'lab_tech', 'radiology_tech'];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Đang chờ duyệt' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
];

const ROLE_OPTIONS = ROLES.map(value => ({ value, label: roleLabel(value) }));

const EMPTY_CREATE_FORM: StaffCreateFormValues = {
  fullname: '', email: '', password: '', role: 'receptionist', department_id: '',
};

export default function Users() {
  const { userId, role: currentRole } = useAuth();
  const canCreate = currentRole === 'admin';
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending']);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate,
    control: createControl, formState: { errors: createErrors },
  } = useForm<StaffCreateFormValues>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: EMPTY_CREATE_FORM,
  });

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listUsers({
        q: search || undefined,
        status: statusFilter.length === 0 ? undefined : statusFilter.join(','),
        role: roleFilter.length === 0 ? undefined : roleFilter.join(','),
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setUsers(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const hasActiveFilters = !!searchInput || statusFilter.length !== 1 || statusFilter[0] !== 'pending' || roleFilter.length > 0;

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter([]);
    setRoleFilter([]);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

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

  const openCreate = () => {
    resetCreate(EMPTY_CREATE_FORM);
    setCreateError('');
    setShowPassword(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const handleCreate = handleCreateSubmit(async values => {
    setCreateError('');
    setCreating(true);
    try {
      await createUser({
        fullname: values.fullname.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        department_id: values.department_id ? Number(values.department_id) : undefined,
      });
      await fetchUsers();
      setCreateOpen(false);
    } catch (err) {
      setCreateError(resolveError(err));
    } finally {
      setCreating(false);
    }
  });

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Nhân viên</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Duyệt tài khoản đăng ký mới và quản lý vai trò nhân viên
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={openCreate}
            size="cta"
          >
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Thêm nhân viên
          </Button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, email…"
            className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <MultiSelect
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tất cả trạng thái"
          className="w-[180px]"
        />
        <MultiSelect
          options={ROLE_OPTIONS}
          selected={roleFilter}
          onChange={setRoleFilter}
          placeholder="Tất cả vai trò"
          className="w-[180px]"
        />
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.75 text-sm font-medium text-[#6c757d] hover:text-[#dc3545]"
          >
            <Icon icon="fa6-solid:filter-circle-xmark" className="text-sm" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : users.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:user-check" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">
              {hasActiveFilters ? 'Không có nhân viên nào phù hợp' : 'Không có tài khoản nào đang chờ duyệt'}
            </h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="Nhân viên" column="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Vai trò" column="role" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Trạng thái" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Ngày đăng ký" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleLock(user)}
                        disabled={busyId === user.ID || String(user.ID) === String(userId)}
                        title={String(user.ID) === String(userId) ? 'Không thể tự khóa tài khoản của chính mình' : 'Khóa tài khoản'}
                        size="cta-sm"
                        className="border-[#dc3545]/30 bg-white text-[#dc3545]"
                      >
                        <Icon icon="fa6-solid:lock" className="text-[12px]" />Khóa
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleActivate(user)}
                        disabled={busyId === user.ID}
                        size="cta-sm"
                      >
                        <Icon icon={user.Status === 'locked' ? 'fa6-solid:unlock' : 'fa6-solid:check'} className="text-[12px]" />
                        {user.Status === 'locked' ? 'Mở khóa' : 'Duyệt'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={canCreate && createOpen} onOpenChange={open => { if (!open) closeCreate(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Thêm nhân viên</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên *</label>
            <Input
              {...registerCreate('fullname')}
              placeholder="VD: Nguyễn Văn A"
              aria-invalid={!!createErrors.fullname}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={createErrors.fullname?.message} />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Email *</label>
                <Input
                  type="email"
                  {...registerCreate('email')}
                  placeholder="nhanvien@smartclinic.vn"
                  aria-invalid={!!createErrors.email}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={createErrors.email?.message} />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...registerCreate('password')}
                    placeholder="Tối thiểu 8 ký tự"
                    aria-invalid={!!createErrors.password}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 pr-10 text-[15px] text-[#274760]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-[#6c757d]"
                  >
                    <Icon icon={showPassword ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'} className="text-sm" />
                  </button>
                </div>
                <FieldError message={createErrors.password?.message} />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Vai trò *</label>
            <Controller
              control={createControl}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={createErrors.role?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa/Phòng</label>
            <Controller
              control={createControl}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={value => field.onChange(value === 'none' ? '' : value)}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Không thuộc khoa cụ thể --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Không thuộc khoa cụ thể --</SelectItem>
                    {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />

            {createError && (
              <ErrorAlert icon={false} className="mt-4">{createError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeCreate}
                disabled={creating}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={creating}
                size="cta"
              >
                {creating ? 'Đang tạo…' : 'Tạo nhân viên'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
