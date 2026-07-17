import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getMyProfile, getPortalDepartments, getPortalDoctors, getPortalAvailableSlots,
  listMyAppointments, bookMyAppointment, cancelMyAppointment,
  getMyHistory, getMyInvoices, updateMyProfile,
} from '../../api/portal';
import { resolveError } from '../../utils/errorMessages';
import {
  appointmentStatusLabel, encounterStatusLabel, encounterTypeLabel, invoiceStatusLabel,
} from '../../utils/labels';
import { usePatientAuth } from '../../context/PatientAuthContext';
import useConfirm from '../../hooks/useConfirm';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';

const TABS = [
  { key: 'appointments', label: 'Lịch hẹn' },
  { key: 'history', label: 'Lịch sử khám' },
  { key: 'invoices', label: 'Hóa đơn' },
  { key: 'profile', label: 'Hồ sơ của tôi' },
];

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
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState('appointments');
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [invoices, setInvoices] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [me, appts] = await Promise.all([getMyProfile(), listMyAppointments()]);
      setProfile(me.data);
      setProfileForm({
        phone: me.data.Phone ?? '',
        address: me.data.Address ?? '',
        insurance_number: me.data.InsuranceNumber ?? '',
        allergies: me.data.Allergies ?? '',
      });
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
    setManualDate(''); setManualTime('');
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
    setManualDate(''); setManualTime('');
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
    setManualDate(''); setManualTime('');
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

    let scheduledAt;
    if (form.doctor_id) {
      if (!selectedSlot) {
        setFormError('Vui lòng chọn một khung giờ.');
        return;
      }
      scheduledAt = selectedSlot.start_time;
    } else {
      if (!manualDate || !manualTime) {
        setFormError('Vui lòng chọn ngày và giờ mong muốn.');
        return;
      }
      const parsed = new Date(`${manualDate}T${manualTime}:00`);
      if (parsed.getTime() <= Date.now()) {
        setFormError('Vui lòng chọn thời điểm trong tương lai.');
        return;
      }
      scheduledAt = parsed.toISOString();
    }

    setSaving(true);
    try {
      await bookMyAppointment({
        department_id: Number(form.department_id),
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        scheduled_at: scheduledAt,
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

  const handleTabChange = tabName => {
    setTab(tabName);
    if (tabName === 'history' && !history) {
      setLoadingHistory(true);
      getMyHistory()
        .then(r => setHistory(r.data))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingHistory(false));
    }
    if (tabName === 'invoices' && !invoices) {
      setLoadingInvoices(true);
      getMyInvoices()
        .then(r => setInvoices(r.data ?? []))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingInvoices(false));
    }
  };

  const handleProfileSave = async e => {
    e.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateMyProfile(profileForm);
      const me = await getMyProfile();
      setProfile(me.data);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(resolveError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const canSubmitBooking = !!form.department_id
    && (form.doctor_id ? !!selectedSlot : !!(manualDate && manualTime));

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

            <div style={tabBarStyle}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => handleTabChange(t.key)} style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'appointments' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 16px' }}>
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

            {tab === 'history' && (
              <div style={{ marginTop: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#134e48', margin: '0 0 16px' }}>Lịch sử khám &amp; đơn thuốc</h2>
                {loadingHistory ? (
                  <div style={{ ...cardStyle, textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
                ) : !history || history.encounters?.length === 0 ? (
                  <div style={{ ...cardStyle, textAlign: 'center', color: '#6c757d' }}>Chưa có lượt khám nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.encounters.map(enc => {
                      const rx = (history.prescriptions ?? []).filter(p => p.EncounterID === enc.ID);
                      return (
                        <div key={enc.ID} style={cardStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: '700', color: '#134e48' }}>{enc.Department?.Name ?? `Khoa #${enc.DepartmentID}`}</div>
                              <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
                                {encounterTypeLabel(enc.Type)} · {new Date(enc.CheckedInAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <span style={statusBadgeStyle(enc.Status === 'completed' ? 'booked' : enc.Status)}>
                              {encounterStatusLabel(enc.Status)}
                            </span>
                          </div>
                          {enc.ClinicalNotes && (
                            <div style={{ fontSize: '13px', color: '#134e48', marginTop: '10px' }}>{enc.ClinicalNotes}</div>
                          )}
                          {rx.length > 0 && (
                            <div style={{ marginTop: '12px', borderTop: '1px solid #d1fae5', paddingTop: '12px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#134e48', marginBottom: '6px' }}>Đơn thuốc</div>
                              {rx.map(p => (
                                <ul key={p.ID} style={{ margin: 0, paddingLeft: '18px' }}>
                                  {(p.Items ?? []).map(item => (
                                    <li key={item.ID} style={{ fontSize: '13px', color: '#6c757d' }}>
                                      {item.Drug?.Name ?? `Thuốc #${item.DrugID}`} — {item.Dosage}, SL {item.Quantity}
                                      {item.Instructions ? ` (${item.Instructions})` : ''}
                                    </li>
                                  ))}
                                </ul>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'invoices' && (
              <div style={{ marginTop: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#134e48', margin: '0 0 16px' }}>Hóa đơn của tôi</h2>
                {loadingInvoices ? (
                  <div style={{ ...cardStyle, textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
                ) : !invoices || invoices.length === 0 ? (
                  <div style={{ ...cardStyle, textAlign: 'center', color: '#6c757d' }}>Chưa có hóa đơn nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {invoices.map(inv => (
                      <div key={inv.ID} style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#134e48' }}>
                              {inv.TotalAmount?.toLocaleString('vi-VN')} đ
                            </div>
                            <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
                              {new Date(inv.CreatedAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                          <span style={statusBadgeStyle(inv.Status === 'paid' ? 'booked' : inv.Status === 'unpaid' ? 'no_show' : 'cancelled')}>
                            {invoiceStatusLabel(inv.Status)}
                          </span>
                        </div>
                        {(inv.Items ?? []).length > 0 && (
                          <ul style={{ margin: '10px 0 0', paddingLeft: '18px' }}>
                            {inv.Items.map(item => (
                              <li key={item.ID} style={{ fontSize: '13px', color: '#6c757d' }}>
                                {item.Description} — {item.Amount?.toLocaleString('vi-VN')} đ
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && profileForm && (
              <div style={{ marginTop: '20px', maxWidth: '480px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#134e48', margin: '0 0 16px' }}>Hồ sơ của tôi</h2>
                <div style={cardStyle}>
                  <form onSubmit={handleProfileSave}>
                    <label style={labelStyle}>Số điện thoại</label>
                    <input
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      style={inputStyle}
                    />
                    <label style={labelStyle}>Địa chỉ</label>
                    <input
                      value={profileForm.address}
                      onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                      style={inputStyle}
                    />
                    <label style={labelStyle}>Số thẻ BHYT</label>
                    <input
                      value={profileForm.insurance_number}
                      onChange={e => setProfileForm({ ...profileForm, insurance_number: e.target.value })}
                      style={inputStyle}
                    />
                    <label style={labelStyle}>Dị ứng</label>
                    <input
                      value={profileForm.allergies}
                      onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })}
                      style={inputStyle}
                    />

                    {profileError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{profileError}</div>}
                    {profileSaved && (
                      <div style={{ marginTop: '16px', fontSize: '13px', color: '#0d9488', fontWeight: '600' }}>
                        Đã lưu thay đổi.
                      </div>
                    )}

                    <button type="submit" disabled={savingProfile} style={{ ...primaryBtnStyle, marginTop: '20px', width: '100%', justifyContent: 'center' }}>
                      {savingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </button>
                  </form>
                </div>
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
              <Select value={form.department_id ? String(form.department_id) : ''} onValueChange={handleDepartmentChange}>
                <SelectTrigger style={portalSelectTriggerStyle}>
                  <SelectValue placeholder="-- Chọn khoa --" />
                </SelectTrigger>
                <SelectContent className="z-[1100]">
                  {departments.map(d => (
                    <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label style={labelStyle}>Bác sĩ (tùy chọn)</label>
              <Select
                value={form.doctor_id ? String(form.doctor_id) : 'any'}
                onValueChange={value => handleDoctorChange(value === 'any' ? '' : value)}
                disabled={doctors.length === 0}
              >
                <SelectTrigger style={portalSelectTriggerStyle}>
                  <SelectValue placeholder="-- Bác sĩ bất kỳ --" />
                </SelectTrigger>
                <SelectContent className="z-[1100]">
                  <SelectItem value="any">-- Bác sĩ bất kỳ --</SelectItem>
                  {doctors.map(doc => (
                    <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {doctors.length === 0 && (
                <p style={{ fontSize: '13px', color: '#dc3545', margin: '8px 0 0' }}>
                  Khoa này hiện chưa có bác sĩ nào — vui lòng chọn khoa khác.
                </p>
              )}

              {form.doctor_id && (
                <>
                  <label style={labelStyle}>Chọn ngày khám</label>
                  <input type="date" value={slotDate} onChange={e => handleSlotDateChange(e.target.value)} style={inputStyle} min={new Date().toISOString().slice(0, 10)} />
                  {loadingSlots && <p style={{ fontSize: '13px', color: '#6c757d', margin: '8px 0 0' }}>Đang tải khung giờ…</p>}
                  {!loadingSlots && slotDate && slots.length === 0 && (
                    <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.2)' }}>
                      <p style={{ fontSize: '13px', color: '#dc3545', margin: 0, fontWeight: '600' }}>
                        Bác sĩ không có khung giờ trống ngày này.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDoctorChange('')}
                        style={{ marginTop: '6px', padding: 0, border: 'none', background: 'none', color: '#0d9488', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Đặt lịch không cần chọn bác sĩ cụ thể
                      </button>
                    </div>
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

              {!form.doctor_id && form.department_id && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Ngày mong muốn</label>
                      <input
                        type="date"
                        required
                        value={manualDate}
                        onChange={e => setManualDate(e.target.value)}
                        style={inputStyle}
                        min={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Giờ mong muốn</label>
                      <input
                        type="time"
                        required
                        value={manualTime}
                        onChange={e => setManualTime(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6c757d', margin: '8px 0 0' }}>
                    Chưa chọn bác sĩ cụ thể — phòng khám sẽ sắp xếp bác sĩ phù hợp cho lịch hẹn của bạn.
                  </p>
                </>
              )}

              <label style={labelStyle}>Lý do khám</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={inputStyle} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving || !canSubmitBooking} style={primaryBtnStyle}>{saving ? 'Đang đặt…' : 'Xác nhận đặt lịch'}</button>
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
const portalSelectTriggerStyle = { width: '100%', height: 'auto', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d1fae5', fontSize: '15px', color: '#134e48' };
const slotChipStyle = { padding: '8px 14px', borderRadius: '20px', border: '1px solid #d1fae5', background: '#fff', color: '#134e48', fontSize: '13px', fontWeight: '600', cursor: 'pointer' };
const slotChipSelectedStyle = { ...slotChipStyle, background: '#0d9488', borderColor: '#0d9488', color: '#fff' };
const tabBarStyle = { display: 'flex', gap: '6px', borderBottom: '1px solid #d1fae5', marginTop: '24px' };
const tabBtnStyle = { padding: '10px 16px', border: 'none', background: 'transparent', color: '#6c757d', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '2px solid transparent' };
const tabBtnActiveStyle = { ...tabBtnStyle, color: '#0d9488', borderBottom: '2px solid #0d9488' };
