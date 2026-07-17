import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getAdmissionById, transferAdmission, dischargeAdmission,
  listProgressNotes, addProgressNote, listNursingLogs, addNursingLog,
} from '../api/admission';
import { getDepartments } from '../api/department';
import { listWards } from '../api/ward';
import { listBeds } from '../api/bed';
import { useAuth } from '../context/AuthContext';
import { resolveError } from '../utils/errorMessages';
import { admissionTypeLabel, encounterTypeLabel } from '../utils/labels';

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = ['admin', 'doctor', 'nurse'].includes(role);
  const canDischarge = ['admin', 'doctor'].includes(role);
  const canAddProgressNote = ['admin', 'doctor'].includes(role);
  const canAddNursingLog = ['admin', 'nurse'].includes(role);

  const [admission, setAdmission] = useState(null);
  const [progressNotes, setProgressNotes] = useState([]);
  const [nursingLogs, setNursingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, p, n] = await Promise.all([
        getAdmissionById(id),
        listProgressNotes(id),
        listNursingLogs(id),
      ]);
      setAdmission(a.data);
      setProgressNotes(p.data ?? []);
      setNursingLogs(n.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>;
  }
  if (error && !admission) {
    return <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>;
  }

  const isDischarged = !!admission.DischargedAt;
  const patient = admission.Encounter?.Patient;

  return (
    <>
      <Link to="/admissions" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#307bc4', textDecoration: 'none', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
        <Icon icon="fa6-solid:arrow-left" style={{ fontSize: '12px' }} /> Danh sách nội trú
      </Link>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#274760', margin: 0 }}>{patient?.Fullname ?? `Bệnh nhân #${admission.Encounter?.PatientID}`}</h1>
            <p style={{ color: '#6c757d', margin: '4px 0 0', fontSize: '14px' }}>
              MRN: {patient?.MRN ?? '—'} · {admission.Encounter?.Department?.Name ?? '—'} · {admissionTypeLabel(admission.AdmissionType)} · Nhập viện {new Date(admission.AdmittedAt).toLocaleString('vi-VN')}
            </p>
            <p style={{ color: '#6c757d', margin: '4px 0 0', fontSize: '14px' }}>
              Vị trí hiện tại: {admission.Ward?.Name ?? 'Chưa xếp khu'} {admission.Bed ? `· Giường ${admission.Bed.BedNumber}` : '· Chưa xếp giường'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={badgeStyle(isDischarged)}>{isDischarged ? 'Đã xuất viện' : 'Đang điều trị'}</span>
            <Link to={`/encounters/${admission.EncounterID}`} style={secondaryBtnStyle}>
              <Icon icon="fa6-solid:stethoscope" style={{ fontSize: '12px', marginRight: '6px' }} />Hồ sơ khám ({encounterTypeLabel(admission.Encounter?.Type)})
            </Link>
          </div>
        </div>
        {patient?.Allergies && (
          <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(220,53,69,0.08)', color: '#dc3545', fontSize: '13px', fontWeight: '600' }}>
            <Icon icon="fa6-solid:triangle-exclamation" style={{ marginRight: '6px' }} />Dị ứng: {patient.Allergies}
          </div>
        )}
        {isDischarged && admission.DischargeSummary && (
          <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: '#f4f7fa', fontSize: '13px', color: '#274760' }}>
            <strong>Tóm tắt xuất viện:</strong> {admission.DischargeSummary}
          </div>
        )}
        {error && <div style={{ ...errorBoxStyle, marginTop: '14px' }}>{error}</div>}
      </div>

      {!isDischarged && canManage && (
        <TransferDischargeSection
          admission={admission}
          canDischarge={canDischarge}
          onChanged={loadAll}
          onDischarged={() => navigate('/admissions')}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <ProgressNotesSection admissionId={id} notes={progressNotes} canAdd={canAddProgressNote && !isDischarged} onAdded={loadAll} />
        <NursingLogsSection admissionId={id} logs={nursingLogs} progressNotes={progressNotes} canAdd={canAddNursingLog && !isDischarged} onAdded={loadAll} />
      </div>
    </>
  );
}

function TransferDischargeSection({ admission, canDischarge, onChanged, onDischarged }) {
  const [mode, setMode] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [form, setForm] = useState({ department_id: '', ward_id: '', bed_id: '', reason: '' });
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const toggleTransfer = () => {
    if (mode === 'transfer') {
      setMode(null);
      return;
    }
    setForm({ department_id: '', ward_id: '', bed_id: '', reason: '' });
    setWards([]);
    setBeds([]);
    setFormError('');
    setMode('transfer');
  };

  const toggleDischarge = () => {
    setFormError('');
    setMode(mode === 'discharge' ? null : 'discharge');
  };

  const handleWardChange = async wardId => {
    setForm(f => ({ ...f, ward_id: wardId, bed_id: '' }));
    if (!wardId) {
      setBeds([]);
      return;
    }
    try {
      const result = await listBeds({ ward_id: wardId, status: 'available' });
      setBeds(result.data ?? []);
    } catch {
      setBeds([]);
    }
  };

  const handleDepartmentChange = async departmentId => {
    setForm(f => ({ ...f, department_id: departmentId, ward_id: '', bed_id: '' }));
    setBeds([]);
    if (!departmentId) {
      setWards([]);
      return;
    }
    try {
      const result = await listWards(departmentId);
      setWards(result.data ?? []);
    } catch {
      setWards([]);
    }
  };

  const handleTransfer = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await transferAdmission(admission.ID, {
        ward_id: form.ward_id ? Number(form.ward_id) : undefined,
        bed_id: form.bed_id ? Number(form.bed_id) : undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        reason: form.reason,
      });
      setMode(null);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDischarge = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await dischargeAdmission(admission.ID, dischargeSummary);
      onDischarged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...cardStyle, marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mode ? '14px' : 0 }}>
        <h2 style={{ ...sectionTitleStyle, margin: 0 }}>Chuyển khoa/giường & Xuất viện</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={toggleTransfer} style={secondaryBtnStyle}>
            <Icon icon="fa6-solid:right-left" style={{ fontSize: '12px', marginRight: '6px' }} />Chuyển giường
          </button>
          {canDischarge && (
            <button onClick={toggleDischarge} style={{ ...secondaryBtnStyle, color: '#dc3545' }}>
              <Icon icon="fa6-solid:door-open" style={{ fontSize: '12px', marginRight: '6px' }} />Xuất viện
            </button>
          )}
        </div>
      </div>

      {mode === 'transfer' && (
        <form onSubmit={handleTransfer} style={inlineFormStyle}>
          <label style={labelStyle}>Khoa mới (bỏ trống nếu không đổi khoa)</label>
          <select value={form.department_id} onChange={e => handleDepartmentChange(e.target.value)} style={inputStyle}>
            <option value="">-- Giữ nguyên khoa --</option>
            {departments.map(d => <option key={d.ID} value={d.ID}>{d.Name}</option>)}
          </select>
          <label style={labelStyle}>Khu điều trị mới</label>
          <select value={form.ward_id} onChange={e => handleWardChange(e.target.value)} style={inputStyle} disabled={wards.length === 0}>
            <option value="">-- Bỏ xếp khu --</option>
            {wards.map(w => <option key={w.ID} value={w.ID}>{w.Name}</option>)}
          </select>
          <label style={labelStyle}>Giường mới</label>
          <select value={form.bed_id} onChange={e => setForm({ ...form, bed_id: e.target.value })} style={inputStyle} disabled={beds.length === 0}>
            <option value="">-- Bỏ xếp giường --</option>
            {beds.map(b => <option key={b.ID} value={b.ID}>Giường {b.BedNumber}</option>)}
          </select>
          <label style={labelStyle}>Lý do</label>
          <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={inputStyle} />
          {formError && <div style={{ ...errorBoxStyle, marginTop: '10px' }}>{formError}</div>}
          <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, marginTop: '12px' }}>{saving ? 'Đang lưu…' : 'Xác nhận chuyển'}</button>
        </form>
      )}

      {mode === 'discharge' && (
        <form onSubmit={handleDischarge} style={inlineFormStyle}>
          <label style={labelStyle}>Tóm tắt bệnh án xuất viện *</label>
          <textarea required value={dischargeSummary} onChange={e => setDischargeSummary(e.target.value)} style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} />
          {formError && <div style={{ ...errorBoxStyle, marginTop: '10px' }}>{formError}</div>}
          <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, marginTop: '12px', background: '#dc3545' }}>{saving ? 'Đang lưu…' : 'Xác nhận xuất viện'}</button>
        </form>
      )}
    </div>
  );
}

function ProgressNotesSection({ admissionId, notes, canAdd, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ content: '', doctor_orders: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await addProgressNote(admissionId, form);
      setForm({ content: '', doctor_orders: '' });
      setOpen(false);
      await onAdded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionHeader title="Diễn biến & Y lệnh" canAct={canAdd} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Ghi diễn biến" />
      {notes.length === 0 ? (
        <p style={emptyTextStyle}>Chưa có ghi nhận diễn biến.</p>
      ) : (
        <ul style={listStyle}>
          {notes.map(n => (
            <li key={n.ID} style={listItemStyle}>
              <div>
                <div style={{ fontWeight: '600', color: '#274760' }}>{n.Content}</div>
                {n.DoctorOrders && <div style={{ fontSize: '13px', color: '#6c757d' }}>Y lệnh: {n.DoctorOrders}</div>}
                <div style={{ fontSize: '12px', color: '#6c757d' }}>{new Date(n.RecordedAt).toLocaleString('vi-VN')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canAdd && (
        <form onSubmit={handleSubmit} style={inlineFormStyle}>
          <label style={labelStyle}>Diễn biến bệnh *</label>
          <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />
          <label style={labelStyle}>Y lệnh trong ngày</label>
          <textarea value={form.doctor_orders} onChange={e => setForm({ ...form, doctor_orders: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />
          {formError && <div style={{ ...errorBoxStyle, marginTop: '10px' }}>{formError}</div>}
          <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, marginTop: '12px' }}>{saving ? 'Đang lưu…' : 'Lưu diễn biến'}</button>
        </form>
      )}
    </div>
  );
}

function NursingLogsSection({ admissionId, logs, progressNotes, canAdd, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ progress_note_id: '', action: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await addNursingLog(admissionId, {
        progress_note_id: form.progress_note_id ? Number(form.progress_note_id) : undefined,
        action: form.action,
        notes: form.notes,
      });
      setForm({ progress_note_id: '', action: '', notes: '' });
      setOpen(false);
      await onAdded();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionHeader title="Nhật ký điều dưỡng" canAct={canAdd} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Ghi thực hiện" />
      {logs.length === 0 ? (
        <p style={emptyTextStyle}>Chưa có nhật ký nào.</p>
      ) : (
        <ul style={listStyle}>
          {logs.map(l => (
            <li key={l.ID} style={listItemStyle}>
              <div>
                <div style={{ fontWeight: '600', color: '#274760' }}>{l.Action}</div>
                {l.Notes && <div style={{ fontSize: '13px', color: '#6c757d' }}>{l.Notes}</div>}
                <div style={{ fontSize: '12px', color: '#6c757d' }}>{new Date(l.PerformedAt).toLocaleString('vi-VN')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && canAdd && (
        <form onSubmit={handleSubmit} style={inlineFormStyle}>
          <label style={labelStyle}>Y lệnh liên quan</label>
          <select value={form.progress_note_id} onChange={e => setForm({ ...form, progress_note_id: e.target.value })} style={inputStyle}>
            <option value="">-- Không gắn y lệnh --</option>
            {progressNotes.map(n => <option key={n.ID} value={n.ID}>{n.DoctorOrders || n.Content}</option>)}
          </select>
          <label style={labelStyle}>Hành động *</label>
          <input required placeholder="VD: Tiêm thuốc, truyền dịch, thay băng…" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} style={inputStyle} />
          <label style={labelStyle}>Ghi chú</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
          {formError && <div style={{ ...errorBoxStyle, marginTop: '10px' }}>{formError}</div>}
          <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, marginTop: '12px' }}>{saving ? 'Đang lưu…' : 'Lưu nhật ký'}</button>
        </form>
      )}
    </div>
  );
}

function SectionHeader({ title, canAct, open, onToggle, actionLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
      <h2 style={{ ...sectionTitleStyle, margin: 0 }}>{title}</h2>
      {canAct && (
        <button onClick={onToggle} style={secondaryBtnStyle}>
          <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:plus'} style={{ fontSize: '12px', marginRight: '6px' }} />
          {open ? 'Đóng' : actionLabel}
        </button>
      )}
    </div>
  );
}

function badgeStyle(isDischarged) {
  return {
    display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    background: isDischarged ? 'rgba(108,117,125,0.1)' : 'rgba(25,135,84,0.1)',
    color: isDischarged ? '#6c757d' : '#198754',
  };
}

const cardStyle = { background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', padding: '24px' };
const sectionTitleStyle = { fontSize: '17px', fontWeight: '700', color: '#274760', margin: '0 0 16px' };
const listStyle = { listStyle: 'none', padding: 0, margin: 0 };
const listItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f4f8', gap: '10px' };
const emptyTextStyle = { color: '#6c757d', fontSize: '14px' };
const secondaryBtnStyle = { display: 'inline-flex', alignItems: 'center', padding: '11px 20px', borderRadius: '25px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', cursor: 'pointer', fontSize: '14px', fontWeight: '500', textDecoration: 'none' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px' };
const inlineFormStyle = { borderTop: '1px solid #f0f4f8', paddingTop: '14px', marginTop: '14px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '10px' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #dde2e8', fontSize: '14px', color: '#274760', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
