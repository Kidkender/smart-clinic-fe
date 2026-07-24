import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments, getDoctorsByDepartment } from '@/api/department';
import { listDoctorSchedules, createDoctorSchedule, deleteDoctorSchedule } from '@/api/doctorSchedule';
import { resolveError } from '@/utils/errorMessages';
import useConfirm from '@/hooks/useConfirm';
import { doctorWeeklyScheduleSchema, type DoctorWeeklyScheduleFormValues } from '@/schemas/doctorSchedule';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
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
  id: number | string;
  fullname: string;
}

interface Schedule {
  ID: number | string;
  DayOfWeek: number;
  StartTime: string;
  EndTime: string;
  SlotMinutes: number;
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

const WEEKDAYS = [1, 2, 3, 4, 5, 6].map(value => ({ value, label: dayLabel(value) }));

const DEFAULT_WEEKLY_SCHEDULE: DoctorWeeklyScheduleFormValues = {
  slot_minutes: 30,
  days: WEEKDAYS.map(d => ({
    day_of_week: d.value, enabled: false, start_time: '08:00', end_time: '17:00',
  })),
};

export default function DoctorSchedules() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formError, setFormError] = useState('');
  const [dayErrors, setDayErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();
  const {
    control, handleSubmit, reset, formState: { errors },
  } = useForm<DoctorWeeklyScheduleFormValues>({
    resolver: zodResolver(doctorWeeklyScheduleSchema),
    defaultValues: DEFAULT_WEEKLY_SCHEDULE,
  });
  const { fields } = useFieldArray({ control, name: 'days' });

  useEffect(() => {
    getDepartments().then(r => {
      const list = r.data ?? [];
      setDepartments(list);
      if (list.length > 0) setDepartmentId(String(list[0].ID));
    }).catch(err => setError(resolveError(err)));
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setDoctors([]);
      return;
    }
    getDoctorsByDepartment(departmentId).then(r => {
      const list = r.data ?? [];
      setDoctors(list);
      setDoctorId(String(list[0]?.id ?? ''));
    }).catch(() => setDoctors([]));
  }, [departmentId]);

  useEffect(() => {
    if (!doctorId) {
      setSchedules([]);
      return;
    }
    fetchSchedules();
    reset(DEFAULT_WEEKLY_SCHEDULE);
    setDayErrors({});
    setFormError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listDoctorSchedules(doctorId);
      setSchedules(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = handleSubmit(async values => {
    setFormError('');
    setDayErrors({});

    const enabledDays = values.days.filter(d => d.enabled);
    if (enabledDays.length === 0) {
      setFormError('Vui lòng chọn ít nhất một ngày làm việc.');
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(enabledDays.map(day => createDoctorSchedule(doctorId, {
        department_id: Number(departmentId),
        day_of_week: day.day_of_week,
        start_time: day.start_time,
        end_time: day.end_time,
        slot_minutes: values.slot_minutes,
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

      await fetchSchedules();

      if (Object.keys(nextDayErrors).length > 0) {
        setDayErrors(nextDayErrors);
        setFormError(`Đã lưu ${succeededCount}/${enabledDays.length} ngày. Vui lòng kiểm tra các ngày còn lỗi bên dưới.`);
        reset({
          slot_minutes: values.slot_minutes,
          days: values.days.map(d => (d.enabled && nextDayErrors[d.day_of_week] ? d : { ...d, enabled: false })),
        });
      } else {
        reset(DEFAULT_WEEKLY_SCHEDULE);
      }
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (schedule: Schedule) => {
    if (!(await confirm('Xóa ca làm việc này?'))) return;
    try {
      await deleteDoctorSchedule(doctorId, schedule.ID);
      await fetchSchedules();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Lịch làm việc bác sĩ</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Thiết lập khung giờ làm việc theo tuần cho từng bác sĩ — dùng để sinh khung giờ đặt lịch
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="h-auto max-w-[220px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue placeholder="Chọn khoa/phòng" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(d => (
              <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={doctorId} onValueChange={setDoctorId} disabled={doctors.length === 0}>
          <SelectTrigger className="h-auto max-w-[220px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue placeholder={doctors.length === 0 ? 'Khoa chưa có bác sĩ' : undefined} />
          </SelectTrigger>
          <SelectContent>
            {doctors.map(doc => (
              <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      {doctorId && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-5">
          <Card className="rounded-2xl border-[#e8edf2] p-6">
            <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Ca làm việc hiện tại</h2>
            {loading ? (
              <p className="text-sm text-[#6c757d]">Đang tải…</p>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-[#6c757d]">Chưa thiết lập ca làm việc nào.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {schedules.map(s => (
                  <li key={s.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                    <div>
                      <div className="font-semibold text-[#274760]">{dayLabel(s.DayOfWeek)}</div>
                      <div className="text-[13px] text-[#6c757d]">
                        {s.StartTime.slice(0, 5)} - {s.EndTime.slice(0, 5)} · mỗi {s.SlotMinutes} phút
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      title="Xóa"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                    >
                      <Icon icon="fa6-solid:xmark" className="text-xs" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl border-[#e8edf2] p-6">
            <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Thêm ca làm việc</h2>
            <form onSubmit={handleCreate} noValidate>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ngày làm việc trong tuần</label>
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => (
                  <Controller
                    key={field.id}
                    control={control}
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
                            {WEEKDAYS[index].label}
                          </label>
                          <Input
                            type="time"
                            value={dayField.value.start_time}
                            disabled={!dayField.value.enabled}
                            onChange={e => dayField.onChange({ ...dayField.value, start_time: e.target.value })}
                            aria-invalid={!!errors.days?.[index]?.start_time}
                            className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.5 text-sm text-[#274760]"
                          />
                          <span className="text-sm text-[#6c757d]">đến</span>
                          <Input
                            type="time"
                            value={dayField.value.end_time}
                            disabled={!dayField.value.enabled}
                            onChange={e => dayField.onChange({ ...dayField.value, end_time: e.target.value })}
                            aria-invalid={!!errors.days?.[index]?.end_time}
                            className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.5 text-sm text-[#274760]"
                          />
                        </div>
                        <FieldError message={errors.days?.[index]?.start_time?.message ?? errors.days?.[index]?.end_time?.message} />
                        <FieldError message={dayErrors[WEEKDAYS[index].value]} />
                      </div>
                    )}
                  />
                ))}
              </div>

              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Độ dài mỗi khung giờ (phút)</label>
              <Controller
                control={control}
                name="slot_minutes"
                render={({ field }) => (
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={field.value}
                    onChange={e => field.onChange(Number(e.target.value))}
                    aria-invalid={!!errors.slot_minutes}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                  />
                )}
              />
              <FieldError message={errors.slot_minutes?.message} />

              {formError && (
                <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
              )}

              <Button
                type="submit"
                disabled={saving}
                size="cta-block" className="mt-5"
              >
                {saving ? 'Đang lưu…' : 'Lưu lịch làm việc'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}
