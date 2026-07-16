import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { searchAppointments, createAppointment, cancelAppointment, markNoShow, checkInAppointment } from '../api/appointment';
import { getDepartments, getDoctorsByDepartment } from '../api/department';
import { getAvailableSlots } from '../api/doctorSchedule';
import { resolveError } from '../utils/errorMessages';
import { appointmentStatusLabel } from '../utils/labels';
import useConfirm from '../hooks/useConfirm';

function toLocalDateTimeInput(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: '', department_id: '', doctor_id: '', scheduled_at: '', reason: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchAppointments({ page: 1, limit: 20 });
      setAppointments(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
  }, [fetchAppointments]);

  const openCreate = () => {
    const departmentId = departments[0]?.ID ?? '';
    setForm({ patient_id: '', department_id: departmentId, doctor_id: '', scheduled_at: '', reason: '' });
    setFormError('');
    setSlotDate('');
    setSlots([]);
    setModalOpen(true);
    if (departmentId) {
      getDoctorsByDepartment(departmentId).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    } else {
      setDoctors([]);
    }
  };

  const handleDepartmentChange = async departmentId => {
    setForm(f => ({ ...f, department_id: departmentId, doctor_id: '' }));
    setSlotDate('');
    setSlots([]);
    if (!departmentId) {
      setDoctors([]);
      return;
    }
    try {
      const result = await getDoctorsByDepartment(departmentId);
      setDoctors(result.data ?? []);
    } catch {
      setDoctors([]);
    }
  };

  const handleDoctorChange = doctorId => {
    setForm(f => ({ ...f, doctor_id: doctorId }));
    setSlotDate('');
    setSlots([]);
  };

  const handleSlotDateChange = async date => {
    setSlotDate(date);
    setSlots([]);
    if (!date || !form.doctor_id) return;
    setLoadingSlots(true);
    try {
      const result = await getAvailableSlots(form.doctor_id, date);
      setSlots(result.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePickSlot = slot => {
    setForm(f => ({ ...f, scheduled_at: toLocalDateTimeInput(slot.start_time) }));
  };

  const handleCreate = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createAppointment({
        patient_id: Number(form.patient_id),
        department_id: Number(form.department_id),
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        reason: form.reason,
      });
      await fetchAppointments();
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async appt => {
    if (!(await confirm('Hủy lịch hẹn này?', { confirmLabel: 'Hủy lịch' }))) return;
    try {
      await cancelAppointment(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleNoShow = async appt => {
    try {
      await markNoShow(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleCheckIn = async appt => {
    try {
      await checkInAppointment(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>Lịch hẹn</h1>
          <p style={{ color: '#6c757d', marginTop: '4px', marginBottom: 0, fontSize: '15px' }}>
            Đặt lịch và quản lý tiếp nhận bệnh nhân
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Icon icon="fa6-solid:plus" style={{ fontSize: '14px' }} />
          <span>Đặt lịch hẹn</span>
        </button>
      </div>

      {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Chưa có lịch hẹn nào.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa' }}>
                <th style={thStyle}>Bệnh nhân</th>
                <th style={thStyle}>Khoa</th>
                <th style={thStyle}>Bác sĩ</th>
                <th style={thStyle}>Thời gian</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.ID} style={{ borderTop: '1px solid #f0f4f8' }}>
                  <td style={tdStyle}>{a.Patient?.Fullname ?? `#${a.PatientID}`}</td>
                  <td style={tdStyle}>{a.Department?.Name ?? `#${a.DepartmentID}`}</td>
                  <td style={tdStyle}>{a.Doctor?.Fullname ?? '—'}</td>
                  <td style={tdStyle}>{new Date(a.ScheduledAt).toLocaleString('vi-VN')}</td>
                  <td style={tdStyle}><span style={statusBadgeStyle(a.Status)}>{appointmentStatusLabel(a.Status)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {a.Status === 'booked' && (
                      <>
                        <button onClick={() => handleCheckIn(a)} style={{ ...iconBtnStyle, color: '#198754' }} title="Check-in">
                          <Icon icon="fa6-solid:right-to-bracket" style={{ fontSize: '13px' }} />
                        </button>
                        <button onClick={() => handleNoShow(a)} style={{ ...iconBtnStyle, marginLeft: '8px' }} title="Không đến">
                          <Icon icon="fa6-solid:user-clock" style={{ fontSize: '13px' }} />
                        </button>
                        <button onClick={() => handleCancel(a)} style={{ ...iconBtnStyle, marginLeft: '8px', color: '#dc3545' }} title="Hủy">
                          <Icon icon="fa6-solid:xmark" style={{ fontSize: '13px' }} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) !saving && setModalOpen(false); }}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#274760' }}>Đặt lịch hẹn</h2>
            <form onSubmit={handleCreate}>
              <label style={labelStyle}>Mã bệnh nhân (ID) *</label>
              <input required type="number" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Khoa *</label>
              <select required value={form.department_id} onChange={e => handleDepartmentChange(e.target.value)} style={inputStyle}>
                <option value="">-- Chọn khoa --</option>
                {departments.map(d => <option key={d.ID} value={d.ID}>{d.Name}</option>)}
              </select>

              <label style={labelStyle}>Bác sĩ (tùy chọn)</label>
              <select value={form.doctor_id} onChange={e => handleDoctorChange(e.target.value)} style={inputStyle} disabled={doctors.length === 0}>
                <option value="">-- Không chỉ định bác sĩ --</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.fullname}</option>)}
              </select>
              {form.department_id && doctors.length === 0 && (
                <p style={{ fontSize: '13px', color: '#6c757d', margin: '6px 0 0' }}>Khoa này chưa có bác sĩ nào.</p>
              )}

              {form.doctor_id && (
                <>
                  <label style={labelStyle}>Chọn ngày để xem khung giờ trống</label>
                  <input type="date" value={slotDate} onChange={e => handleSlotDateChange(e.target.value)} style={inputStyle} />
                  {loadingSlots && <p style={{ fontSize: '13px', color: '#6c757d', margin: '8px 0 0' }}>Đang tải khung giờ…</p>}
                  {!loadingSlots && slotDate && slots.length === 0 && (
                    <p style={{ fontSize: '13px', color: '#6c757d', margin: '8px 0 0' }}>Bác sĩ không có khung giờ trống ngày này — bạn có thể tự nhập giờ hẹn bên dưới.</p>
                  )}
                  {slots.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {slots.map(slot => {
                        const isSelected = form.scheduled_at === toLocalDateTimeInput(slot.start_time);
                        return (
                          <button
                            key={slot.start_time}
                            type="button"
                            onClick={() => handlePickSlot(slot)}
                            style={isSelected ? slotChipSelectedStyle : slotChipStyle}
                          >
                            {new Date(slot.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <label style={labelStyle}>Thời gian hẹn *</label>
              <input required type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Lý do khám</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={inputStyle} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? 'Đang lưu…' : 'Đặt lịch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}

function statusBadgeStyle(status) {
  const colors = {
    booked: { bg: 'rgba(48,123,196,0.1)', fg: '#307bc4' },
    checked_in: { bg: 'rgba(25,135,84,0.1)', fg: '#198754' },
    cancelled: { bg: 'rgba(220,53,69,0.1)', fg: '#dc3545' },
    no_show: { bg: 'rgba(108,117,125,0.1)', fg: '#6c757d' },
  };
  const c = colors[status] ?? colors.booked;
  return {
    display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '600', background: c.bg, color: c.fg,
  };
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#274760' };
const iconBtnStyle = { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e8edf2', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6c757d' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const secondaryBtnStyle = { padding: '11px 20px', borderRadius: '25px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(39,71,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBoxStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8', fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box' };
const slotChipStyle = { padding: '8px 14px', borderRadius: '20px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', fontSize: '13px', fontWeight: '600', cursor: 'pointer' };
const slotChipSelectedStyle = { ...slotChipStyle, background: '#307bc4', borderColor: '#307bc4', color: '#fff' };
