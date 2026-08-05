import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments } from '@/api/department';
import {
  getEmployee,
  getEmployeeProfile,
  upsertEmployeeProfile,
  listStaffShifts,
  createStaffShift,
  deleteStaffShift,
  clockIn,
  clockOut,
  listAttendance,
  createManualAttendance,
  updateAttendance,
} from '@/api/hr';
import { resolveError } from '@/utils/errorMessages';
import { roleLabel } from '@/utils/labels';
import useConfirm from '@/hooks/useConfirm';
import {
  employeeProfileSchema, type EmployeeProfileFormValues,
  staffWeeklyShiftSchema, type StaffWeeklyShiftFormValues,
} from '@/schemas/hr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Department {
  ID: number | string;
  Name: string;
}

interface Employee {
  ID: number | string;
  Fullname: string;
  Email: string;
  Role: string;
}

interface Shift {
  ID: number | string;
  DepartmentID?: number | string | null;
  DayOfWeek: number;
  StartTime: string;
  EndTime: string;
}

interface AttendanceRecord {
  ID: number | string;
  ClockInAt?: string | null;
  ClockOutAt?: string | null;
  Status: string;
  worked_minutes?: number | null;
}

const DAYS = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

function dayLabel(value: number) {
  return DAYS.find(d => d.value === value)?.label ?? value;
}

const DEPARTMENT_REQUIRED_ROLES = ['nurse', 'lab_tech', 'radiology_tech', 'pharmacist'];

const DEFAULT_WEEKLY_SHIFT: StaffWeeklyShiftFormValues = {
  department_id: '',
  days: DAYS.map(d => ({
    day_of_week: d.value, enabled: false, start_time: '08:00', end_time: '17:00',
  })),
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString();
}

const ATTENDANCE_BADGE_VARIANT: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  present: 'secondary',
  late: 'outline',
  absent: 'destructive',
};

export default function EmployeeDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, ConfirmDialog] = useConfirm();
  const departmentRequired = !!employee && DEPARTMENT_REQUIRED_ROLES.includes(employee.Role);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const {
    register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<EmployeeProfileFormValues>({
    resolver: zodResolver(employeeProfileSchema),
    defaultValues: { position: '', license_no: '', qualification: '', institution: '', years_experience: 0 },
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [savingShift, setSavingShift] = useState(false);
  const [shiftFormError, setShiftFormError] = useState('');
  const [dayErrors, setDayErrors] = useState<Record<number, string>>({});
  const [shiftError, setShiftError] = useState('');
  const {
    control: shiftControl, handleSubmit: handleShiftSubmit, watch: watchShift, reset: resetShiftForm,
    formState: { errors: shiftErrors },
  } = useForm<StaffWeeklyShiftFormValues>({
    resolver: zodResolver(staffWeeklyShiftSchema),
    defaultValues: DEFAULT_WEEKLY_SHIFT,
  });
  const { fields: dayFields } = useFieldArray({ control: shiftControl, name: 'days' });
  const shiftDepartmentId = watchShift('department_id');

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [manualClockIn, setManualClockIn] = useState('');
  const [manualClockOut, setManualClockOut] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [employeeResult, profileResult, shiftsResult, attendanceResult] = await Promise.all([
        getEmployee(id),
        getEmployeeProfile(id).catch(() => ({ data: null })),
        listStaffShifts(id),
        listAttendance(id, { limit: 20 }),
      ]);
      setEmployee(employeeResult.data ?? null);
      setShifts(shiftsResult.data ?? []);
      setAttendance(attendanceResult.data ?? []);
      if (profileResult.data) {
        resetProfile({
          position: profileResult.data.Position ?? '',
          license_no: profileResult.data.LicenseNo ?? '',
          qualification: profileResult.data.Qualification ?? '',
          institution: profileResult.data.Institution ?? '',
          years_experience: profileResult.data.YearsExperience ?? 0,
        });
      }
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [id, resetProfile]);

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const departmentName = (deptId?: number | string | null) =>
    departments.find(d => String(d.ID) === String(deptId))?.Name ?? '—';

  const handleSaveProfile = handleProfileSubmit(async values => {
    if (!(await confirm(`Lưu hồ sơ nhân sự cho "${employee?.Fullname}"?`, { confirmLabel: 'Lưu' }))) return;
    setProfileError('');
    setSavingProfile(true);
    try {
      await upsertEmployeeProfile(id, {
        position: values.position,
        license_no: values.license_no,
        qualification: values.qualification,
        institution: values.institution,
        years_experience: Number(values.years_experience),
      });
    } catch (err) {
      setProfileError(resolveError(err));
    } finally {
      setSavingProfile(false);
    }
  });

  const handleCreateShift = handleShiftSubmit(async values => {
    setShiftFormError('');
    setDayErrors({});

    const enabledDays = values.days.filter(d => d.enabled);
    if (enabledDays.length === 0) {
      setShiftFormError('Vui lòng chọn ít nhất một ngày làm việc.');
      return;
    }
    if (departmentRequired && !values.department_id) {
      setShiftFormError('Vai trò này cần chọn khoa phụ trách cho ca trực.');
      return;
    }
    if (!(await confirm(`Lưu lịch trực (${enabledDays.length} ngày) cho "${employee?.Fullname}"?`, { confirmLabel: 'Lưu' }))) return;

    setSavingShift(true);
    try {
      const results = await Promise.allSettled(enabledDays.map(day => createStaffShift(id, {
        department_id: values.department_id ? Number(values.department_id) : undefined,
        day_of_week: day.day_of_week,
        start_time: day.start_time,
        end_time: day.end_time,
      })));

      const nextDayErrors: Record<number, string> = {};
      let succeededCount = 0;
      results.forEach((result, index) => {
        const dayOfWeek = enabledDays[index].day_of_week;
        if (result.status === 'rejected') {
          nextDayErrors[dayOfWeek] = resolveError(result.reason);
        } else {
          succeededCount += 1;
        }
      });

      const result = await listStaffShifts(id);
      setShifts(result.data ?? []);

      if (Object.keys(nextDayErrors).length > 0) {
        setDayErrors(nextDayErrors);
        setShiftFormError(`Đã lưu ${succeededCount}/${enabledDays.length} ngày. Vui lòng kiểm tra các ngày còn lỗi bên dưới.`);
        resetShiftForm({
          department_id: values.department_id,
          days: values.days.map(d => (d.enabled && nextDayErrors[d.day_of_week] ? d : { ...d, enabled: false })),
        });
      } else {
        resetShiftForm({ ...DEFAULT_WEEKLY_SHIFT, department_id: values.department_id });
      }
    } finally {
      setSavingShift(false);
    }
  });

  const handleDeleteShift = async (shift: Shift) => {
    if (!(await confirm('Xóa ca trực này?', { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteStaffShift(id, shift.ID);
      const result = await listStaffShifts(id);
      setShifts(result.data ?? []);
    } catch (err) {
      setShiftError(resolveError(err));
    }
  };

  const openAttendance = attendance.find(a => a.ClockInAt && !a.ClockOutAt);

  const refreshAttendance = async () => {
    const result = await listAttendance(id, { limit: 20 });
    setAttendance(result.data ?? []);
  };

  const handleClockIn = async () => {
    if (!(await confirm(`Chấm công vào cho "${employee?.Fullname}" lúc ${new Date().toLocaleTimeString('vi-VN')}?`, { confirmLabel: 'Chấm công vào' }))) return;
    setAttendanceError('');
    setAttendanceBusy(true);
    try {
      await clockIn(id);
      await refreshAttendance();
    } catch (err) {
      setAttendanceError(resolveError(err));
    } finally {
      setAttendanceBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!(await confirm(`Chấm công ra cho "${employee?.Fullname}" lúc ${new Date().toLocaleTimeString('vi-VN')}?`, { confirmLabel: 'Chấm công ra' }))) return;
    setAttendanceError('');
    setAttendanceBusy(true);
    try {
      await clockOut(id);
      await refreshAttendance();
    } catch (err) {
      setAttendanceError(resolveError(err));
    } finally {
      setAttendanceBusy(false);
    }
  };

  const openManualCreate = () => {
    setManualClockIn('');
    setManualClockOut('');
    setManualError('');
    setManualOpen(true);
  };

  const closeManualCreate = () => {
    if (manualSaving) return;
    setManualOpen(false);
  };

  const handleManualCreate = async () => {
    if (!manualClockIn) {
      setManualError('Vui lòng nhập giờ vào.');
      return;
    }
    if (!(await confirm(`Bổ sung lượt chấm công cho "${employee?.Fullname}"?`, { confirmLabel: 'Lưu' }))) return;
    setManualError('');
    setManualSaving(true);
    try {
      await createManualAttendance(id, {
        clock_in_at: fromDatetimeLocal(manualClockIn),
        clock_out_at: manualClockOut ? fromDatetimeLocal(manualClockOut) : undefined,
      });
      await refreshAttendance();
      setManualOpen(false);
    } catch (err) {
      setManualError(resolveError(err));
    } finally {
      setManualSaving(false);
    }
  };

  const openEditAttendance = (record: AttendanceRecord) => {
    setEditClockIn(toDatetimeLocal(record.ClockInAt));
    setEditClockOut(toDatetimeLocal(record.ClockOutAt));
    setEditError('');
    setEditingRecord(record);
  };

  const closeEditAttendance = () => {
    if (editSaving) return;
    setEditingRecord(null);
  };

  const handleUpdateAttendanceSubmit = async () => {
    if (!editingRecord) return;
    if (!(await confirm(`Cập nhật lượt chấm công cho "${employee?.Fullname}"?`, { confirmLabel: 'Lưu' }))) return;
    setEditError('');
    setEditSaving(true);
    try {
      await updateAttendance(id, editingRecord.ID, {
        clock_in_at: editClockIn ? fromDatetimeLocal(editClockIn) : undefined,
        clock_out_at: editClockOut ? fromDatetimeLocal(editClockOut) : undefined,
      });
      await refreshAttendance();
      setEditingRecord(null);
    } catch (err) {
      setEditError(resolveError(err));
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[#6c757d]">Đang tải…</p>;
  if (error) return <ErrorAlert>{error}</ErrorAlert>;
  if (!employee) return <ErrorAlert>Không tìm thấy nhân viên.</ErrorAlert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button type="button" onClick={() => navigate('/employees')} className="text-sm text-[#307bc4]">← Danh sách nhân sự</button>
          <h1 className="mt-1 text-2xl font-bold text-[#274760]">{employee.Fullname}</h1>
          <p className="text-sm text-[#6c757d]">{employee.Email} · {roleLabel(employee.Role)}</p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#274760]">Hồ sơ nhân viên</h2>
        <form onSubmit={handleSaveProfile} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Chức danh</label>
            <Input placeholder="VD: Điều dưỡng trưởng" {...registerProfile('position')} />
            <FieldError message={profileErrors.position?.message} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Chứng chỉ hành nghề</label>
            <Input placeholder="VD: 001234/BYT-CCHN" {...registerProfile('license_no')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Bằng cấp</label>
            <Input placeholder="VD: Cử nhân Điều dưỡng" {...registerProfile('qualification')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Đơn vị đào tạo</label>
            <Input placeholder="VD: ĐH Y Hà Nội" {...registerProfile('institution')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#274760]">Số năm kinh nghiệm</label>
            <Input type="number" placeholder="VD: 5" {...registerProfile('years_experience', { valueAsNumber: true })} />
            <FieldError message={profileErrors.years_experience?.message} />
          </div>
          <div className="sm:col-span-2">
            {profileError && <ErrorAlert icon={false} className="mb-4">{profileError}</ErrorAlert>}
            <Button type="submit" size="cta" disabled={savingProfile}>
              {savingProfile ? 'Đang lưu…' : 'Lưu hồ sơ'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#274760]">Chấm công</h2>
        {attendanceError && <ErrorAlert icon={false} className="mb-4">{attendanceError}</ErrorAlert>}
        <div className="mb-4 flex flex-wrap gap-3">
          <Button type="button" size="cta" disabled={attendanceBusy || !!openAttendance} onClick={handleClockIn}>
            Chấm công vào
          </Button>
          <Button type="button" size="cta" variant="danger" disabled={attendanceBusy || !openAttendance} onClick={handleClockOut}>
            Chấm công ra
          </Button>
          <Button type="button" size="cta" variant="outline" onClick={openManualCreate}>
            Bổ sung chấm công
          </Button>
        </div>
        {attendance.length === 0 ? (
          <p className="text-sm text-[#6c757d]">Chưa có dữ liệu chấm công.</p>
        ) : (
          <div className="space-y-2">
            {attendance.map(a => (
              <div key={a.ID} className="flex items-center justify-between rounded-lg border border-[#f0f4f8] px-4 py-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">{formatDateTime(a.ClockInAt)} → {formatDateTime(a.ClockOutAt)}</div>
                  {a.worked_minutes != null && (
                    <div className="text-[13px] text-[#6c757d]">{a.worked_minutes} phút</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ATTENDANCE_BADGE_VARIANT[a.Status] ?? 'outline'}>{a.Status}</Badge>
                  <Button type="button" size="cta-xs" variant="outline" onClick={() => openEditAttendance(a)}>
                    Sửa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-5">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#274760]">Ca trực hiện tại</h2>
          {shifts.length === 0 ? (
            <p className="text-sm text-[#6c757d]">Chưa có ca trực nào.</p>
          ) : (
            <div className="space-y-2">
              {shifts.map(s => (
                <div key={s.ID} className="flex items-center justify-between rounded-lg border border-[#f0f4f8] px-4 py-2.5">
                  <div>
                    <div className="font-semibold text-[#274760]">{dayLabel(s.DayOfWeek)}</div>
                    <div className="text-[13px] text-[#6c757d]">{s.StartTime.slice(0, 5)} - {s.EndTime.slice(0, 5)} · {departmentName(s.DepartmentID)}</div>
                  </div>
                  <Button type="button" size="cta-xs" variant="danger" onClick={() => handleDeleteShift(s)}>
                    Xóa
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#274760]">Thêm ca trực</h2>
          <form onSubmit={handleCreateShift} noValidate>
            <label className="mb-1 block text-sm font-medium text-[#274760]">
              Khoa phụ trách{departmentRequired ? '' : ' (không bắt buộc)'}
            </label>
            <Controller
              control={shiftControl}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder={departmentRequired ? 'Chọn khoa' : 'Không thuộc khoa cụ thể'} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={shiftErrors.department_id?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ngày làm việc trong tuần</label>
            <div className="flex flex-col gap-2">
              {dayFields.map((field, index) => (
                <Controller
                  key={field.id}
                  control={shiftControl}
                  name={`days.${index}`}
                  render={({ field: dayField }) => (
                    <div className="rounded-xl border border-[#dde2e8] p-3">
                      <div className="flex items-center gap-3">
                        <label className="flex w-[76px] shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-[#274760]">
                          <input
                            type="checkbox"
                            checked={dayField.value.enabled}
                            onChange={e => dayField.onChange({ ...dayField.value, enabled: e.target.checked })}
                            className="size-4"
                          />
                          {DAYS[index].label}
                        </label>
                        <Input
                          type="time"
                          value={dayField.value.start_time}
                          disabled={!dayField.value.enabled}
                          onChange={e => dayField.onChange({ ...dayField.value, start_time: e.target.value })}
                          aria-invalid={!!shiftErrors.days?.[index]?.start_time}
                          className="h-auto max-w-[140px]"
                        />
                        <span className="text-sm text-[#6c757d]">đến</span>
                        <Input
                          type="time"
                          value={dayField.value.end_time}
                          disabled={!dayField.value.enabled}
                          onChange={e => dayField.onChange({ ...dayField.value, end_time: e.target.value })}
                          aria-invalid={!!shiftErrors.days?.[index]?.end_time}
                          className="h-auto max-w-[140px]"
                        />
                      </div>
                      <FieldError message={shiftErrors.days?.[index]?.start_time?.message ?? shiftErrors.days?.[index]?.end_time?.message} />
                      <FieldError message={dayErrors[DAYS[index].value]} />
                    </div>
                  )}
                />
              ))}
            </div>

            {shiftFormError && (
              <ErrorAlert icon={false} className="mt-4">{shiftFormError}</ErrorAlert>
            )}
            {shiftError && (
              <ErrorAlert icon={false} className="mt-4">{shiftError}</ErrorAlert>
            )}
            <Button
              type="submit"
              size="cta"
              className="mt-4"
              disabled={savingShift || (departmentRequired && !shiftDepartmentId)}
            >
              {savingShift ? 'Đang lưu…' : 'Lưu lịch trực'}
            </Button>
          </form>
        </Card>
      </div>

      <Dialog open={manualOpen} onOpenChange={open => { if (!open) closeManualCreate(); }}>
        <DialogContent className="sm:max-w-[420px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Bổ sung chấm công</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#274760]">Giờ vào</label>
              <Input type="datetime-local" value={manualClockIn} onChange={e => setManualClockIn(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#274760]">Giờ ra (không bắt buộc)</label>
              <Input type="datetime-local" value={manualClockOut} onChange={e => setManualClockOut(e.target.value)} />
            </div>
            {manualError && <ErrorAlert icon={false}>{manualError}</ErrorAlert>}
          </div>
          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button type="button" variant="outline" size="cta" onClick={closeManualCreate} disabled={manualSaving}>
              Hủy
            </Button>
            <Button type="button" size="cta" onClick={handleManualCreate} disabled={manualSaving}>
              {manualSaving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={open => { if (!open) closeEditAttendance(); }}>
        <DialogContent className="sm:max-w-[420px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Sửa lượt chấm công</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#274760]">Giờ vào</label>
              <Input type="datetime-local" value={editClockIn} onChange={e => setEditClockIn(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#274760]">Giờ ra</label>
              <Input type="datetime-local" value={editClockOut} onChange={e => setEditClockOut(e.target.value)} />
            </div>
            {editError && <ErrorAlert icon={false}>{editError}</ErrorAlert>}
          </div>
          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button type="button" variant="outline" size="cta" onClick={closeEditAttendance} disabled={editSaving}>
              Hủy
            </Button>
            <Button type="button" size="cta" onClick={handleUpdateAttendanceSubmit} disabled={editSaving}>
              {editSaving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
