import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { searchPatients, createPatient } from '../api/patient';
import { resolveError } from '../utils/errorMessages';
import { genderLabel } from '../utils/labels';

const GENDERS = ['male', 'female', 'other'];
const EMPTY_FORM = { fullname: '', gender: 'other', phone: '', cccd: '', address: '', insurance_number: '', allergies: '', date_of_birth: '' };

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPatients = useCallback(async name => {
    setLoading(true);
    setError('');
    try {
      const result = await searchPatients({ name: name || undefined, page: 1, limit: 20 });
      setPatients(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients('');
  }, [fetchPatients]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    fetchPatients(search.trim());
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createPatient({ ...form, date_of_birth: form.date_of_birth ? `${form.date_of_birth}T00:00:00Z` : null });
      await fetchPatients(search.trim());
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>Bệnh nhân</h1>
          <p style={{ color: '#6c757d', marginTop: '4px', marginBottom: 0, fontSize: '15px' }}>
            Tra cứu và tiếp nhận bệnh nhân
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Icon icon="fa6-solid:plus" style={{ fontSize: '14px' }} />
          <span>Thêm bệnh nhân</span>
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, SĐT, CCCD, MRN…"
          style={{ ...inputStyle, maxWidth: '360px' }}
        />
        <button type="submit" style={secondaryBtnStyle}>Tìm kiếm</button>
      </form>

      {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Không tìm thấy bệnh nhân nào.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa' }}>
                <th style={thStyle}>MRN</th>
                <th style={thStyle}>Họ tên</th>
                <th style={thStyle}>Giới tính</th>
                <th style={thStyle}>SĐT</th>
                <th style={thStyle}>CCCD</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr
                  key={p.ID}
                  onClick={() => navigate(`/patients/${p.ID}`)}
                  style={{ borderTop: '1px solid #f0f4f8', cursor: 'pointer' }}
                >
                  <td style={tdStyle}>{p.MRN}</td>
                  <td style={tdStyle}>{p.Fullname}</td>
                  <td style={tdStyle}>{genderLabel(p.Gender)}</td>
                  <td style={tdStyle}>{p.Phone}</td>
                  <td style={tdStyle}>{p.CCCD}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) !saving && setModalOpen(false); }}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#274760' }}>Thêm bệnh nhân</h2>
            <form onSubmit={handleCreate}>
              <label style={labelStyle}>Họ tên *</label>
              <input required value={form.fullname} onChange={e => setForm({ ...form, fullname: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Giới tính *</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
                {GENDERS.map(g => <option key={g} value={g}>{genderLabel(g)}</option>)}
              </select>

              <label style={labelStyle}>Số điện thoại</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>CCCD</label>
              <input value={form.cccd} onChange={e => setForm({ ...form, cccd: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Địa chỉ</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Ngày sinh</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Số BHYT</label>
              <input value={form.insurance_number} onChange={e => setForm({ ...form, insurance_number: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Tiền sử dị ứng</label>
              <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} style={inputStyle} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? 'Đang lưu…' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#274760' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const secondaryBtnStyle = { padding: '11px 20px', borderRadius: '25px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(39,71,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBoxStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8', fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box' };
