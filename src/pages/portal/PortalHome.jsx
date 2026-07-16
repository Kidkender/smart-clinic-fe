import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getMyProfile, getPortalDepartments, getPortalDoctors, getPortalAvailableSlots,
  listMyAppointments, bookMyAppointment, cancelMyAppointment,
} from '../../api/portal';
import { resolveError } from '../../utils/errorMessages';
import { appointmentStatusLabel } from '../../utils/labels';
import { usePatientAuth } from '../../context/PatientAuthContext';
import useConfirm from '../../hooks/useConfirm';

export default function PortalHome() {
  const { logout } = usePatientAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, ConfirmDialog] = useConfirm();

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ department_id: '', doctor_id: '', reason: '' });
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [me, appts] = await Promise.all([getMyProfile(), listMyAppointments()]);
      setProfile(me.data);
      setAppointments(appts.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    getPortalDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
  }, [loadAll]);

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const openBooking = () => {
    setForm({ department_id: departments[0]?.ID ?? '', doctor_id: '', reason: '' });
    setDoctors([]);
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    setFormError('');
    setModalOpen(true);
    if (departments[0]?.ID) {
      getPortalDoctors(departments[0].ID).then(r => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    }
  };

  const handleDepartmentChange = async departmentId => {
    setForm(f => ({ ...f, department_id: departmentId, doctor_id: '' }));
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
    if (!departmentId) {
      setDoctors([]);
      return;
    }
    try {
      const result = await getPortalDoctors(departmentId);
      setDoctors(result.data ?? []);
    } catch {
      setDoctors([]);
    }
  };

  const handleDoctorChange = doctorId => {
    setForm(f => ({ ...f, doctor_id: doctorId }));
    setSlotDate('');
    setSlots([]);
    setSelectedSlot(null);
  };

  const handleSlotDateChange = async date => {
    setSlotDate(date);
    setSlots([]);
    setSelectedSlot(null);
    if (!date || !form.doctor_id) return;
    setLoadingSlots(true);
    try {
      const result = await getPortalAvailableSlots(form.doctor_id, date);
      setSlots(result.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async e => {
    e.preventDefault();
    setFormError('');
    if (!selectedSlot) {
      setFormError('Vui lòng chọn một khung giờ.');
      return;
    }
    setSaving(true);
    try {
      await bookMyAppointment({
        department_id: Number(form.department_id),
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        scheduled_at: selectedSlot.start_time,
        reason: form.reason,
      });
      await loadAll();
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
      await cancelMyAppointment(appt.ID);
      await loadAll();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#0d6b5f' }}>SmartClinic</span>
          <span style={{ fontSize: '13px', color: '#6c757d' }}>Cổng bệnh nhân</span>
        </Link>
        <button onClick={handleLogout} style={logoutBtnStyle}>
          <Icon icon="fa6-solid:right-from-bracket" style={{ fontSize: '13px', marginRight: '6px' }} />Đăng xuất
        </button>
      </header>

      <main style={mainStyle}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
        ) : (
          <>
            {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

            {profile && (
              <div style={cardStyle}>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#134e48', margin: 0 }}>Xin chào, {profile.Fullname}</h1>
                <p style={{ color: '#6c757d', margin: '4px 0 0', fontSize: '14px' }}>Mã hồ sơ: {profile.MRN}</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#134e48', margin: 0 }}>Lịch hẹn của tôi</h2>
              <button onClick={openBooking} style={primaryBtnStyle}>
                <Icon icon="fa6-solid:plus" style={{ fontSize: '13px' }} /> Đặt lịch mới
              </button>
            </div>

            {appointments.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#6c757d' }}>Bạn chưa có lịch hẹn nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {appointments.map(a => (
                  <div key={a.ID} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#134e48' }}>{a.Department?.Name ?? `Khoa #${a.DepartmentID}`}</div>
                        <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
                          {a.Doctor?.Fullname ? `BS. ${a.Doctor.Fullname} · ` : ''}{new Date(a.ScheduledAt).toLocaleString('vi-VN')}
                        </div>
                        {a.Reason && <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>Lý do: {a.Reason}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={statusBadgeStyle(a.Status)}>{appointmentStatusLabel(a.Status)}</span>
                        {a.Status === 'booked' && (
                          <button onClick={() => handleCancel(a)} style={cancelBtnStyle}>Hủy</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {modalOpen && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) !saving && setModalOpen(false); }}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#134e48' }}>Đặt lịch khám</h2>
            <form onSubmit={handleBook}>
              <label style={labelStyle}>Khoa *</label>
              <select required value={form.department_id} onChange={e => handleDepartmentChange(e.target.value)} style={inputStyle}>
                <option value="">-- Chọn khoa --</option>
                {departments.map(d => <option key={d.ID} value={d.ID}>{d.Name}</option>)}
              </select>

              <label style={labelStyle}>Bác sĩ (tùy chọn)</label>
              <select value={form.doctor_id} onChange={e => handleDoctorChange(e.target.value)} style={inputStyle} disabled={doctors.length === 0}>
                <option value="">-- Bác sĩ bất kỳ --</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.fullname}</option>)}
              </select>

              {form.doctor_id && (
                <>
                  <label style={labelStyle}>Chọn ngày khám</label>
                  <input type="date" value={slotDate} onChange={e => handleSlotDateChange(e.target.value)} style={inputStyle} min={new Date().toISOString().slice(0, 10)} />
                  {loadingSlots && <p style={{ fontSize: '13px', color: '#6c757d', margin: '8px 0 0' }}>Đang tải khung giờ…</p>}
                  {!loadingSlots && slotDate && slots.length === 0 && (
                    <p style={{ fontSize: '13px', color: '#6c757d', margin: '8px 0 0' }}>Bác sĩ không có khung giờ trống ngày này.</p>
                  )}
                  {slots.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {slots.map(slot => {
                        const isSelected = selectedSlot?.start_time === slot.start_time;
                        return (
                          <button
                            key={slot.start_time}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
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

              {!form.doctor_id && (
                <p style={{ fontSize: '13px', color: '#6c757d', margin: '10px 0 0' }}>Chọn bác sĩ để xem khung giờ trống.</p>
              )}

              <label style={labelStyle}>Lý do khám</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={inputStyle} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? 'Đang đặt…' : 'Xác nhận đặt lịch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}

function statusBadgeStyle(status) {
  const colors = {
    booked: { bg: 'rgba(13,148,136,0.1)', fg: '#0d9488' },
    checked_in: { bg: 'rgba(25,135,84,0.1)', fg: '#198754' },
    cancelled: { bg: 'rgba(220,53,69,0.1)', fg: '#dc3545' },
    no_show: { bg: 'rgba(108,117,125,0.1)', fg: '#6c757d' },
  };
  const c = colors[status] ?? colors.booked;
  return { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: c.bg, color: c.fg };
}

const pageStyle = { minHeight: '100vh', background: '#f0fdfa' };
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', background: '#fff', borderBottom: '1px solid #d1fae5' };
const mainStyle = { maxWidth: '760px', margin: '0 auto', padding: '32px 20px' };
const cardStyle = { background: '#fff', borderRadius: '16px', border: '1px solid #d1fae5', padding: '20px 24px', marginBottom: '4px' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '25px', border: 'none', background: '#0d9488', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const secondaryBtnStyle = { padding: '10px 18px', borderRadius: '25px', border: '1px solid #d1fae5', background: '#fff', color: '#134e48', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const cancelBtnStyle = { padding: '7px 14px', borderRadius: '20px', border: '1px solid #dc354533', background: '#fff', color: '#dc3545', cursor: 'pointer', fontSize: '13px', fontWeight: '600' };
const logoutBtnStyle = { display: 'flex', alignItems: 'center', padding: '8px 16px', borderRadius: '20px', border: '1px solid #d1fae5', background: '#fff', color: '#6c757d', cursor: 'pointer', fontSize: '13px', fontWeight: '500' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(19,78,72,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBoxStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#134e48', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d1fae5', fontSize: '15px', color: '#134e48', outline: 'none', boxSizing: 'border-box' };
const slotChipStyle = { padding: '8px 14px', borderRadius: '20px', border: '1px solid #d1fae5', background: '#fff', color: '#134e48', fontSize: '13px', fontWeight: '600', cursor: 'pointer' };
const slotChipSelectedStyle = { ...slotChipStyle, background: '#0d9488', borderColor: '#0d9488', color: '#fff' };
