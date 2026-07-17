import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getDepartments } from '@/api/department';
import {
  getDoctor,
  listDoctorShifts,
  createDoctorShift,
  deleteDoctorShift,
  listDoctorLeaves,
  createDoctorLeave,
  reviewDoctorLeave,
  getDoctorPerformance,
} from '@/api/doctor';
import { resolveError } from '@/utils/errorMessages';
import { shiftTypeLabel, leaveStatusLabel } from '@/utils/labels';
import useConfirm from '@/hooks/useConfirm';
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

interface Department {
  ID: number | string;
  Name: string;
}

interface Doctor {
  ID: number | string;
  Fullname: string;
  Email: string;
  DepartmentID?: number | string | null;
  profile?: { Specialty: string; YearsExperience: number };
}

interface Shift {
  ID: number | string;
  DepartmentID: number | string;
  ShiftDate: string;
  ShiftType: string;
}

interface Leave {
  ID: number | string;
  StartDate: string;
  EndDate: string;
  Reason?: string;
  Status: string;
}

interface Performance {
  patient_count: number;
  encounter_count: number;
  revenue_total: number;
  follow_up_rate: number;
}

const SHIFT_TYPES = ['morning', 'afternoon', 'night', 'on_call'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

const LEAVE_BADGE_VARIANT: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  approved: 'secondary',
  rejected: 'destructive',
  pending: 'outline',
  cancelled: 'outline',
};

export default function DoctorDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftForm, setShiftForm] = useState({ department_id: '', shift_date: todayIso(), shift_type: 'morning' });
  const [savingShift, setSavingShift] = useState(false);
  const [shiftError, setShiftError] = useState('');

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: todayIso(), end_date: todayIso(), reason: '' });
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const [perfRange, setPerfRange] = useState({ from: firstDayOfMonthIso(), to: todayIso() });
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState('');

  const [confirm, ConfirmDialog] = useConfirm();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [doctorResult, shiftsResult, leavesResult] = await Promise.all([
        getDoctor(id),
        listDoctorShifts(id),
        listDoctorLeaves(id, { limit: 50 }),
      ]);
      setDoctor(doctorResult.data ?? null);
      setShifts(shiftsResult.data ?? []);
      setLeaves(leavesResult.data ?? []);
      if (!shiftForm.department_id && doctorResult.data?.DepartmentID) {
        setShiftForm(f => ({ ...f, department_id: String(doctorResult.data.DepartmentID) }));
      }
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreateShift = async (e: FormEvent) => {
    e.preventDefault();
    setShiftError('');
    setSavingShift(true);
    try {
      await createDoctorShift(id, {
        department_id: Number(shiftForm.department_id),
        shift_date: shiftForm.shift_date,
        shift_type: shiftForm.shift_type,
      });
      const result = await listDoctorShifts(id);
      setShifts(result.data ?? []);
    } catch (err) {
      setShiftError(resolveError(err));
    } finally {
      setSavingShift(false);
    }
  };

  const handleDeleteShift = async (shift: Shift) => {
    if (!(await confirm('Xóa ca trực này?'))) return;
    try {
      await deleteDoctorShift(id, shift.ID);
      const result = await listDoctorShifts(id);
      setShifts(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleCreateLeave = async (e: FormEvent) => {
    e.preventDefault();
    setLeaveError('');
    setSavingLeave(true);
    try {
      await createDoctorLeave(id, leaveForm);
      const result = await listDoctorLeaves(id, { limit: 50 });
      setLeaves(result.data ?? []);
      setLeaveForm({ start_date: todayIso(), end_date: todayIso(), reason: '' });
    } catch (err) {
      setLeaveError(resolveError(err));
    } finally {
      setSavingLeave(false);
    }
  };

  const handleReviewLeave = async (leave: Leave, status: 'approved' | 'rejected') => {
    const label = status === 'approved' ? 'Duyệt đơn nghỉ phép này?' : 'Từ chối đơn nghỉ phép này?';
    if (!(await confirm(label, { danger: status === 'rejected', confirmLabel: status === 'approved' ? 'Duyệt' : 'Từ chối' }))) return;
    try {
      await reviewDoctorLeave(leave.ID, status);
      const result = await listDoctorLeaves(id, { limit: 50 });
      setLeaves(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleFetchPerformance = async (e: FormEvent) => {
    e.preventDefault();
    setPerfError('');
    setPerfLoading(true);
    try {
      const result = await getDoctorPerformance(id, perfRange);
      setPerformance(result.data ?? null);
    } catch (err) {
      setPerfError(resolveError(err));
    } finally {
      setPerfLoading(false);
    }
  };

  const departmentName = (deptId?: number | string | null) =>
    departments.find(d => String(d.ID) === String(deptId))?.Name ?? '—';

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }

  if (!doctor) {
    return (
      <div className="p-15 text-center text-[#6c757d]">
        {error || 'Không tìm thấy bác sĩ.'}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/doctors')}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#e8edf2] bg-white text-[#274760]"
        >
          <Icon icon="fa6-solid:arrow-left" className="text-sm" />
        </button>
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">{doctor.Fullname}</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            {doctor.Email} · {departmentName(doctor.DepartmentID)}
            {doctor.profile?.Specialty ? ` · ${doctor.profile.Specialty}` : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-5">
        <Card className="rounded-2xl border-[#e8edf2] p-6">
          <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Ca trực</h2>
          {shifts.length === 0 ? (
            <p className="text-sm text-[#6c757d]">Chưa có ca trực nào.</p>
          ) : (
            <ul className="m-0 mb-3.5 list-none p-0">
              {shifts.map(s => (
                <li key={s.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                  <div>
                    <div className="font-semibold text-[#274760]">{s.ShiftDate.slice(0, 10)}</div>
                    <div className="text-[13px] text-[#6c757d]">{shiftTypeLabel(s.ShiftType)} · {departmentName(s.DepartmentID)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteShift(s)}
                    title="Xóa"
                    className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                  >
                    <Icon icon="fa6-solid:xmark" className="text-xs" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleCreateShift} className="border-t border-[#f0f4f8] pt-4">
            <label className="mt-2 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa/Phòng</label>
            <Select
              value={shiftForm.department_id}
              onValueChange={value => setShiftForm({ ...shiftForm, department_id: value })}
            >
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue placeholder="Chọn khoa/phòng" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ngày trực</label>
                <Input
                  type="date"
                  required
                  value={shiftForm.shift_date}
                  onChange={e => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại ca</label>
                <Select
                  value={shiftForm.shift_type}
                  onValueChange={value => setShiftForm({ ...shiftForm, shift_type: value })}
                >
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map(t => <SelectItem key={t} value={t}>{shiftTypeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {shiftError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {shiftError}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingShift || !shiftForm.department_id}
              className="mt-5 h-auto w-full justify-center rounded-full bg-[#307bc4] py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {savingShift ? 'Đang lưu…' : 'Thêm ca trực'}
            </Button>
          </form>
        </Card>

        <Card className="rounded-2xl border-[#e8edf2] p-6">
          <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Nghỉ phép</h2>
          {leaves.length === 0 ? (
            <p className="text-sm text-[#6c757d]">Chưa có đơn nghỉ phép nào.</p>
          ) : (
            <ul className="m-0 mb-3.5 list-none p-0">
              {leaves.map(l => (
                <li key={l.ID} className="border-b border-[#f0f4f8] py-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div>
                      <div className="font-semibold text-[#274760]">
                        {l.StartDate.slice(0, 10)} → {l.EndDate.slice(0, 10)}
                      </div>
                      {l.Reason && <div className="text-[13px] text-[#6c757d]">{l.Reason}</div>}
                    </div>
                    <Badge variant={LEAVE_BADGE_VARIANT[l.Status] ?? 'outline'}>{leaveStatusLabel(l.Status)}</Badge>
                  </div>
                  {l.Status === 'pending' && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handleReviewLeave(l, 'approved')}
                        className="h-auto rounded-full bg-[#2e9e5b] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2e9e5b]/90"
                      >
                        Duyệt
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleReviewLeave(l, 'rejected')}
                        className="h-auto rounded-full border-[#dc3545]/40 px-3.5 py-1.5 text-xs font-semibold text-[#dc3545]"
                      >
                        Từ chối
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleCreateLeave} className="border-t border-[#f0f4f8] pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-2 mb-1.5 block text-sm font-semibold text-[#274760]">Từ ngày</label>
                <Input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
              <div>
                <label className="mt-2 mb-1.5 block text-sm font-semibold text-[#274760]">Đến ngày</label>
                <Input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
            </div>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Lý do</label>
            <Input
              value={leaveForm.reason}
              onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {leaveError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {leaveError}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingLeave}
              className="mt-5 h-auto w-full justify-center rounded-full bg-[#307bc4] py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {savingLeave ? 'Đang gửi…' : 'Tạo đơn nghỉ phép'}
            </Button>
          </form>
        </Card>

        <Card className="rounded-2xl border-[#e8edf2] p-6">
          <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Hiệu suất</h2>
          <form onSubmit={handleFetchPerformance} className="mb-4 flex flex-wrap items-end gap-2.5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Từ ngày</label>
              <Input
                type="date"
                required
                value={perfRange.from}
                onChange={e => setPerfRange({ ...perfRange, from: e.target.value })}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Đến ngày</label>
              <Input
                type="date"
                required
                value={perfRange.to}
                onChange={e => setPerfRange({ ...perfRange, to: e.target.value })}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <Button
              type="submit"
              disabled={perfLoading}
              className="h-auto rounded-full bg-[#307bc4] px-5 py-3 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {perfLoading ? 'Đang tính…' : 'Xem báo cáo'}
            </Button>
          </form>

          {perfError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
              {perfError}
            </div>
          )}

          {performance && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f7fa] p-4">
                <div className="text-[13px] text-[#6c757d]">Số bệnh nhân</div>
                <div className="text-xl font-bold text-[#274760]">{performance.patient_count}</div>
              </div>
              <div className="rounded-xl bg-[#f4f7fa] p-4">
                <div className="text-[13px] text-[#6c757d]">Số lượt khám</div>
                <div className="text-xl font-bold text-[#274760]">{performance.encounter_count}</div>
              </div>
              <div className="rounded-xl bg-[#f4f7fa] p-4">
                <div className="text-[13px] text-[#6c757d]">Doanh thu</div>
                <div className="text-xl font-bold text-[#274760]">{formatCurrency(performance.revenue_total)}</div>
              </div>
              <div className="rounded-xl bg-[#f4f7fa] p-4">
                <div className="text-[13px] text-[#6c757d]">Tỷ lệ tái khám</div>
                <div className="text-xl font-bold text-[#274760]">{(performance.follow_up_rate * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {ConfirmDialog}
    </>
  );
}
