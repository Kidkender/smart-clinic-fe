import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { admitPatient, listAdmissions } from '../api/admission';
import { getDepartments, getDoctorsByDepartment } from '../api/department';
import { listWards } from '../api/ward';
import { listBeds } from '../api/bed';
import { searchPatients } from '../api/patient';
import { resolveError } from '../utils/errorMessages';
import { admissionTypeLabel } from '../utils/labels';

const ADMISSION_TYPES = ['bhyt', 'service', 'insurance_private'];

export default function Admissions() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('active');
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdmissions({ status: statusFilter || undefined });
      setAdmissions(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const openAdmit = () => {
    setForm(emptyForm());
    setPatientQuery('');
    setPatientResults([]);
    setDoctors([]);
    setWards([]);
    setBeds([]);
    setFormError('');
    setModalOpen(true);
  };

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

  const handleDepartmentChange = async departmentId => {
    setForm(f => ({ ...f, department_id: departmentId, attending_doctor_id: '', ward_id: '', bed_id: '' }));
    setBeds([]);
    if (!departmentId) {
      setDoctors([]);
      setWards([]);
      return;
    }
    try {
      const [doctorsResult, wardsResult] = await Promise.all([
        getDoctorsByDepartment(departmentId),
        listWards(departmentId),
      ]);
      setDoctors(doctorsResult.data ?? []);
      setWards(wardsResult.data ?? []);
    } catch {
      setDoctors([]);
      setWards([]);
    }
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

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const admission = await admitPatient({
        patient_id: Number(form.patient_id),
        department_id: Number(form.department_id),
        attending_doctor_id: Number(form.attending_doctor_id),
        admission_type: form.admission_type,
        ward_id: form.ward_id ? Number(form.ward_id) : undefined,
        bed_id: form.bed_id ? Number(form.bed_id) : undefined,
      });
      setModalOpen(false);
      await fetchAdmissions();
      window.location.assign(`/admissions/${admission.data.ID}`);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>Nội trú</h1>
          <p style={{ color: '#6c757d', marginTop: '4px', marginBottom: 0, fontSize: '15px' }}>
            Danh sách bệnh nhân đang điều trị nội trú
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: '180px' }}>
            <option value="active">Đang điều trị</option>
            <option value="discharged">Đã xuất viện</option>
            <option value="">Tất cả</option>
          </select>
          <button onClick={openAdmit} style={primaryBtnStyle}>
            <Icon icon="fa6-solid:bed-pulse" style={{ fontSize: '14px' }} />
            <span>Nhập viện</span>
          </button>
        </div>
      </div>

      {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
        ) : admissions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Không có đợt nhập viện nào.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa' }}>
                <th style={thStyle}>Bệnh nhân</th>
                <th style={thStyle}>Khoa</th>
                <th style={thStyle}>Giường</th>
                <th style={thStyle}>Diện</th>
                <th style={thStyle}>Ngày nhập</th>
                <th style={thStyle}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map(a => (
                <tr key={a.ID} onClick={() => navigate(`/admissions/${a.ID}`)} style={{ borderTop: '1px solid #f0f4f8', cursor: 'pointer' }}>
                  <td style={{ ...tdStyle, color: '#307bc4', fontWeight: '600' }}>
                    {a.Encounter?.Patient?.Fullname ?? `#${a.Encounter?.PatientID}`}
                  </td>
                  <td style={tdStyle}>{a.Encounter?.Department?.Name ?? '—'}</td>
                  <td style={tdStyle}>{a.Ward?.Name ?? '—'} {a.Bed ? `· ${a.Bed.BedNumber}` : ''}</td>
                  <td style={tdStyle}>{admissionTypeLabel(a.AdmissionType)}</td>
                  <td style={tdStyle}>{new Date(a.AdmittedAt).toLocaleDateString('vi-VN')}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(a.DischargedAt)}>{a.DischargedAt ? 'Đã xuất viện' : 'Đang điều trị'}</span>
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
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#274760' }}>Nhập viện</h2>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Tìm bệnh nhân *</label>
              <input value={patientQuery} onChange={handlePatientSearch} placeholder="Nhập tên, SĐT, CCCD, MRN…" style={inputStyle} />
              {patientResults.length > 0 && (
                <div style={{ border: '1px solid #dde2e8', borderRadius: '10px', marginTop: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {patientResults.map(p => (
                    <div
                      key={p.ID}
                      onClick={() => { setForm(f => ({ ...f, patient_id: p.ID })); setPatientQuery(`${p.Fullname} (${p.MRN})`); setPatientResults([]); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', color: '#274760' }}
                    >
                      {p.Fullname} <span style={{ color: '#6c757d' }}>· {p.MRN}</span>
                    </div>
                  ))}
                </div>
              )}

              <label style={labelStyle}>Khoa điều trị *</label>
              <select required value={form.department_id} onChange={e => handleDepartmentChange(e.target.value)} style={inputStyle}>
                <option value="">-- Chọn khoa --</option>
                {departments.map(d => <option key={d.ID} value={d.ID}>{d.Name}</option>)}
              </select>

              <label style={labelStyle}>Bác sĩ điều trị *</label>
              <select required value={form.attending_doctor_id} onChange={e => setForm({ ...form, attending_doctor_id: e.target.value })} style={inputStyle} disabled={doctors.length === 0}>
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.fullname}</option>)}
              </select>

              <label style={labelStyle}>Diện điều trị *</label>
              <select required value={form.admission_type} onChange={e => setForm({ ...form, admission_type: e.target.value })} style={inputStyle}>
                {ADMISSION_TYPES.map(t => <option key={t} value={t}>{admissionTypeLabel(t)}</option>)}
              </select>

              <label style={labelStyle}>Khu điều trị</label>
              <select value={form.ward_id} onChange={e => handleWardChange(e.target.value)} style={inputStyle} disabled={wards.length === 0}>
                <option value="">-- Chưa xếp giường --</option>
                {wards.map(w => <option key={w.ID} value={w.ID}>{w.Name}</option>)}
              </select>

              {form.ward_id && (
                <>
                  <label style={labelStyle}>Giường trống</label>
                  <select value={form.bed_id} onChange={e => setForm({ ...form, bed_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Chưa chọn giường --</option>
                    {beds.map(b => <option key={b.ID} value={b.ID}>Giường {b.BedNumber}</option>)}
                  </select>
                </>
              )}

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving || !form.patient_id} style={primaryBtnStyle}>{saving ? 'Đang lưu…' : 'Nhập viện'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function emptyForm() {
  return { patient_id: '', department_id: '', attending_doctor_id: '', admission_type: 'bhyt', ward_id: '', bed_id: '' };
}

function badgeStyle(dischargedAt) {
  return {
    display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    background: dischargedAt ? 'rgba(108,117,125,0.1)' : 'rgba(25,135,84,0.1)',
    color: dischargedAt ? '#6c757d' : '#198754',
  };
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#274760' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const secondaryBtnStyle = { padding: '11px 20px', borderRadius: '25px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(39,71,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBoxStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8', fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box' };
