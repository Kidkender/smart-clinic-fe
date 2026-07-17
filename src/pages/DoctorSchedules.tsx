import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { getDepartments, getDoctorsByDepartment } from '@/api/department';
import { listDoctorSchedules, createDoctorSchedule, deleteDoctorSchedule } from '@/api/doctorSchedule';
import { resolveError } from '@/utils/errorMessages';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

export default function DoctorSchedules() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ day_of_week: 1, start_time: '08:00', end_time: '17:00', slot_minutes: 30 });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createDoctorSchedule(doctorId, {
        department_id: Number(departmentId),
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        slot_minutes: Number(form.slot_minutes),
      });
      await fetchSchedules();
      setForm({ day_of_week: 1, start_time: '08:00', end_time: '17:00', slot_minutes: 30 });
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

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

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

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
            <form onSubmit={handleCreate}>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Thứ trong tuần</label>
              <Select
                value={String(form.day_of_week)}
                onValueChange={value => setForm({ ...form, day_of_week: Number(value) })}
              >
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giờ bắt đầu</label>
                  <Input
                    type="time"
                    required
                    value={form.start_time}
                    onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                  />
                </div>
                <div>
                  <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giờ kết thúc</label>
                  <Input
                    type="time"
                    required
                    value={form.end_time}
                    onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                  />
                </div>
              </div>

              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Độ dài mỗi khung giờ (phút)</label>
              <Input
                type="number"
                required
                min={5}
                step={5}
                value={form.slot_minutes}
                onChange={e => setForm({ ...form, slot_minutes: Number(e.target.value) })}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />

              {formError && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="mt-5 h-auto w-full justify-center rounded-full bg-[#307bc4] py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {saving ? 'Đang lưu…' : 'Thêm ca làm việc'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}
