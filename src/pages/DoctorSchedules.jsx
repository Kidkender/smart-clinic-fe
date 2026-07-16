import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getDepartments, getDoctorsByDepartment } from '../api/department';
import { listDoctorSchedules, createDoctorSchedule, deleteDoctorSchedule } from '../api/doctorSchedule';
import { resolveError } from '../utils/errorMessages';
import useConfirm from '../hooks/useConfirm';

const DAYS = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

function dayLabel(value) {
  return DAYS.find(d => d.value === value)?.label ?? value;
}

export default function DoctorSchedules() {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [schedules, setSchedules] = useState([]);
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
      if (list.length > 0) setDepartmentId(list[0].ID);
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
      setDoctorId(list[0]?.id ?? '');
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

  const handleCreate = async e => {
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

  const handleDelete = async schedule => {
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
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>Lịch làm việc bác sĩ</h1>
        <p style={{ color: '#6c757d', marginTop: '4px', marginBottom: 0, fontSize: '15px' }}>
          Thiết lập khung giờ làm việc theo tuần cho từng bác sĩ — dùng để sinh khung giờ đặt lịch
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} style={{ ...inputStyle, maxWidth: '220px' }}>
          {departments.map(d => <option key={d.ID} value={d.ID}>{d.Name}</option>)}
        </select>
        <select value={doctorId} onChange={e => setDoctorId(e.target.value)} style={{ ...inputStyle, maxWidth: '220px' }} disabled={doctors.length === 0}>
          {doctors.length === 0 && <option value="">Khoa chưa có bác sĩ</option>}
          {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.fullname}</option>)}
        </select>
      </div>

      {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

      {doctorId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Ca làm việc hiện tại</h2>
            {loading ? (
              <p style={{ color: '#6c757d', fontSize: '14px' }}>Đang tải…</p>
            ) : schedules.length === 0 ? (
              <p style={{ color: '#6c757d', fontSize: '14px' }}>Chưa thiết lập ca làm việc nào.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {schedules.map(s => (
                  <li key={s.ID} style={listItemStyle}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#274760' }}>{dayLabel(s.DayOfWeek)}</div>
                      <div style={{ fontSize: '13px', color: '#6c757d' }}>
                        {s.StartTime.slice(0, 5)} - {s.EndTime.slice(0, 5)} · mỗi {s.SlotMinutes} phút
                      </div>
                    </div>
                    <button onClick={() => handleDelete(s)} style={{ ...iconBtnStyle, color: '#dc3545' }} title="Xóa">
                      <Icon icon="fa6-solid:xmark" style={{ fontSize: '12px' }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Thêm ca làm việc</h2>
            <form onSubmit={handleCreate}>
              <label style={labelStyle}>Thứ trong tuần</label>
              <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} style={inputStyle}>
                {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Giờ bắt đầu</label>
                  <input type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Giờ kết thúc</label>
                  <input type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <label style={labelStyle}>Độ dài mỗi khung giờ (phút)</label>
              <input type="number" required min={5} step={5} value={form.slot_minutes} onChange={e => setForm({ ...form, slot_minutes: e.target.value })} style={inputStyle} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, marginTop: '20px', width: '100%', justifyContent: 'center' }}>
                {saving ? 'Đang lưu…' : 'Thêm ca làm việc'}
              </button>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}

const cardStyle = { background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', padding: '24px' };
const sectionTitleStyle = { fontSize: '17px', fontWeight: '700', color: '#274760', margin: '0 0 16px' };
const listItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f4f8', gap: '10px' };
const iconBtnStyle = { width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e8edf2', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6c757d' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8', fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box' };
