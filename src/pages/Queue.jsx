import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { checkIn, getTodayQueue, callNext, updateEncounterStatus } from '../api/encounter';
import { getDepartments } from '../api/department';
import { searchPatients } from '../api/patient';
import { resolveError } from '../utils/errorMessages';
import { encounterStatusLabel, encounterTypeLabel } from '../utils/labels';
import useConfirm from '../hooks/useConfirm';

const TYPES = [
  { value: 'new', label: 'Khám mới' },
  { value: 'follow_up', label: 'Tái khám' },
  { value: 'insurance', label: 'BHYT' },
  { value: 'service', label: 'Dịch vụ' },
];

export default function Queue() {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [form, setForm] = useState({ patient_id: '', type: 'new' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const fetchQueue = useCallback(async deptId => {
    if (!deptId) {
      setQueue([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getTodayQueue(deptId);
      setQueue(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getDepartments()
      .then(r => {
        const list = r.data ?? [];
        setDepartments(list);
        if (list.length > 0) setDepartmentId(list[0].ID);
        else setLoading(false);
      })
      .catch(err => {
        setError(resolveError(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (departmentId) fetchQueue(departmentId);
  }, [departmentId, fetchQueue]);

  const handlePatientSearch = async e => {
    const value = e.target.value;
    setPatientQuery(value);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const result = await searchPatients({ name: value.trim(), page: 1, limit: 10 });
      setPatientResults(result.data ?? []);
    } catch {
      setPatientResults([]);
    }
  };

  const openCheckIn = () => {
    setForm({ patient_id: '', type: 'new' });
    setPatientQuery('');
    setPatientResults([]);
    setFormError('');
    setModalOpen(true);
  };

  const handleCheckIn = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await checkIn({ patient_id: Number(form.patient_id), department_id: Number(departmentId), type: form.type });
      await fetchQueue(departmentId);
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCallNext = async () => {
    setCalling(true);
    setError('');
    try {
      await callNext(departmentId);
      await fetchQueue(departmentId);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setCalling(false);
    }
  };

  const handleComplete = async enc => {
    try {
      await updateEncounterStatus(enc.ID, 'completed');
      await fetchQueue(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleCancel = async enc => {
    if (!(await confirm('Hủy lượt khám này?', { confirmLabel: 'Hủy lượt' }))) return;
    try {
      await updateEncounterStatus(enc.ID, 'cancelled');
      await fetchQueue(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const waitingCount = queue.filter(q => q.Status === 'waiting').length;
  const inProgress = queue.find(q => q.Status === 'in_progress');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>Hàng đợi khám</h1>
          <p style={{ color: '#6c757d', marginTop: '4px', marginBottom: 0, fontSize: '15px' }}>
            Check-in bệnh nhân và gọi số theo khoa/phòng
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} style={{ ...inputStyle, maxWidth: '220px' }}>
            {departments.map(d => <option key={d.ID} value={d.ID}>{d.Name}</option>)}
          </select>
          <button onClick={openCheckIn} disabled={!departmentId} style={primaryBtnStyle}>
            <Icon icon="fa6-solid:user-plus" style={{ fontSize: '14px' }} />
            <span>Check-in</span>
          </button>
        </div>
      </div>

      {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Đang chờ" value={waitingCount} color="#307bc4" />
        <StatCard label="Đang khám" value={inProgress ? `#${inProgress.QueueNumber} — ${inProgress.Patient?.Fullname ?? ''}` : '—'} color="#198754" />
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase' }}>Gọi số tiếp theo</div>
          </div>
          <button onClick={handleCallNext} disabled={calling || waitingCount === 0} style={secondaryBtnStyle}>
            {calling ? 'Đang gọi…' : 'Gọi tiếp theo'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
        ) : !departmentId ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Chưa có khoa/phòng nào.</div>
        ) : queue.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Hàng đợi trống.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa' }}>
                <th style={thStyle}>STT</th>
                <th style={thStyle}>Bệnh nhân</th>
                <th style={thStyle}>Loại</th>
                <th style={thStyle}>Check-in</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {queue.map(q => (
                <tr key={q.ID} style={{ borderTop: '1px solid #f0f4f8' }}>
                  <td style={{ ...tdStyle, fontWeight: '700' }}>{q.QueueNumber}</td>
                  <td style={tdStyle}>{q.Patient?.Fullname ?? `#${q.PatientID}`}</td>
                  <td style={tdStyle}>{encounterTypeLabel(q.Type)}</td>
                  <td style={tdStyle}>{q.CheckedInAt ? new Date(q.CheckedInAt).toLocaleTimeString('vi-VN') : '—'}</td>
                  <td style={tdStyle}><span style={statusBadgeStyle(q.Status)}>{encounterStatusLabel(q.Status)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {q.Status === 'in_progress' && (
                      <button onClick={() => handleComplete(q)} style={{ ...iconBtnStyle, color: '#198754' }} title="Hoàn tất">
                        <Icon icon="fa6-solid:check" style={{ fontSize: '13px' }} />
                      </button>
                    )}
                    {(q.Status === 'waiting' || q.Status === 'in_progress') && (
                      <button onClick={() => handleCancel(q)} style={{ ...iconBtnStyle, marginLeft: '8px', color: '#dc3545' }} title="Hủy">
                        <Icon icon="fa6-solid:xmark" style={{ fontSize: '13px' }} />
                      </button>
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
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#274760' }}>Check-in bệnh nhân</h2>
            <form onSubmit={handleCheckIn}>
              <label style={labelStyle}>Tìm bệnh nhân *</label>
              <input
                value={patientQuery}
                onChange={handlePatientSearch}
                placeholder="Nhập tên, SĐT, CCCD, MRN…"
                style={inputStyle}
              />
              {patientResults.length > 0 && (
                <div style={{ border: '1px solid #dde2e8', borderRadius: '10px', marginTop: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {patientResults.map(p => (
                    <div
                      key={p.ID}
                      onClick={() => { setForm({ ...form, patient_id: p.ID }); setPatientQuery(`${p.Fullname} (${p.MRN})`); setPatientResults([]); }}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', fontSize: '14px', color: '#274760',
                        background: form.patient_id === p.ID ? '#f4f7fa' : '#fff',
                      }}
                    >
                      {p.Fullname} <span style={{ color: '#6c757d' }}>· {p.MRN}</span>
                    </div>
                  ))}
                </div>
              )}
              {form.patient_id && <div style={{ marginTop: '6px', fontSize: '13px', color: '#198754' }}>Đã chọn bệnh nhân #{form.patient_id}</div>}

              <label style={labelStyle}>Loại khám *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving || !form.patient_id} style={primaryBtnStyle}>{saving ? 'Đang lưu…' : 'Check-in'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', padding: '18px 20px' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '700', color }}>{value}</div>
    </div>
  );
}

function statusBadgeStyle(status) {
  const colors = {
    waiting: { bg: 'rgba(48,123,196,0.1)', fg: '#307bc4' },
    in_progress: { bg: 'rgba(25,135,84,0.1)', fg: '#198754' },
    completed: { bg: 'rgba(108,117,125,0.1)', fg: '#6c757d' },
    cancelled: { bg: 'rgba(220,53,69,0.1)', fg: '#dc3545' },
  };
  const c = colors[status] ?? colors.waiting;
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
