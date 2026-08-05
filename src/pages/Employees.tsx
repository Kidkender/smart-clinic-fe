import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { listEmployees, getAttendanceSummary } from '@/api/hr';
import { resolveError } from '@/utils/errorMessages';
import { roleLabel, userStatusLabel } from '@/utils/labels';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface EmployeeProfile {
  Position: string;
  YearsExperience: number;
}

interface Employee {
  ID: number | string;
  Fullname: string;
  Email: string;
  Role: string;
  Status: string;
  profile?: EmployeeProfile;
}

const STAFF_ROLES = ['nurse', 'receptionist', 'pharmacist', 'cashier', 'lab_tech', 'radiology_tech', 'admin'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function Employees() {
  const navigate = useNavigate();
  const [role, setRole] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalStaffCount, setTotalStaffCount] = useState<number | null>(null);
  const [presentTodayCount, setPresentTodayCount] = useState<number | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listEmployees({
        q: search || undefined,
        role: role !== 'all' ? role : undefined,
        limit: 100,
      });
      setEmployees(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const [employeesResult, todayResult] = await Promise.all([
        listEmployees({ limit: 100 }),
        getAttendanceSummary({ from: todayIso(), to: todayIso() }),
      ]);
      setTotalStaffCount((employeesResult.data ?? []).length);
      setPresentTodayCount((todayResult.data ?? []).length);
    } catch {
      setTotalStaffCount(null);
      setPresentTodayCount(null);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#274760]">Nhân sự & Chấm công</h1>
          <p className="text-sm text-[#6c757d]">Hồ sơ nhân viên, chia ca trực và chấm công cho đội ngũ không phải bác sĩ.</p>
        </div>
        <Button type="button" size="cta" onClick={() => navigate('/employees/attendance-summary')}>
          Bảng chấm công tháng
        </Button>
      </div>

      <Card className="p-4">
        <p className="text-sm text-[#6c757d]">
          Hôm nay:{' '}
          <span className="font-semibold text-[#274760]">
            {presentTodayCount == null || totalStaffCount == null ? '—' : `${presentTodayCount}/${totalStaffCount}`}
          </span>{' '}
          nhân viên đã chấm công.
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Tìm theo tên hoặc email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="h-auto max-w-xs rounded-xl py-2.75"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-auto w-48 rounded-xl py-2.75 text-sm data-[size=default]:h-auto">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              {STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Chức danh</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6c757d]">Đang tải…</TableCell></TableRow>
            ) : employees.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6c757d]">Không có nhân viên nào.</TableCell></TableRow>
            ) : (
              employees.map(emp => (
                <TableRow
                  key={emp.ID}
                  className="cursor-pointer"
                  onClick={() => navigate(`/employees/${emp.ID}`, { viewTransition: true })}
                >
                  <TableCell className="font-semibold text-[#274760]">{emp.Fullname}</TableCell>
                  <TableCell>{emp.Email}</TableCell>
                  <TableCell>{roleLabel(emp.Role)}</TableCell>
                  <TableCell>{emp.profile?.Position ?? '—'}</TableCell>
                  <TableCell><Badge>{userStatusLabel(emp.Status)}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
