import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerPatient } from '../../api/portal';
import { resolveError } from '../../utils/errorMessages';

export default function PortalRegister() {
  const [form, setForm] = useState({ fullname: '', email: '', password: '', phone: '', cccd: '', gender: 'other' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerPatient(form);
      setSuccess(true);
      setTimeout(() => navigate('/portal/login'), 1200);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '24px' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#0d6b5f' }}>SmartClinic</span>
          <span style={{ fontSize: '13px', color: '#6c757d' }}>Cổng bệnh nhân</span>
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#134e48', marginBottom: '4px' }}>Tạo tài khoản</h1>
        <p style={{ color: '#6c757d', marginBottom: '24px', fontSize: '14px' }}>Đăng ký để tự đặt lịch khám</p>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Họ tên *</label>
          <input required value={form.fullname} onChange={e => setForm({ ...form, fullname: e.target.value })} style={inputStyle} />

          <label style={labelStyle}>Email *</label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />

          <label style={labelStyle}>Mật khẩu *</label>
          <input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} placeholder="Tối thiểu 8 ký tự" />

          <label style={labelStyle}>Giới tính *</label>
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>

          <label style={labelStyle}>Số điện thoại</label>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />

          <label style={labelStyle}>CCCD</label>
          <input value={form.cccd} onChange={e => setForm({ ...form, cccd: e.target.value })} style={inputStyle} />

          {error && <div style={errorBoxStyle}>{error}</div>}
          {success && <div style={successBoxStyle}>Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập…</div>}

          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'Đang tạo…' : 'Đăng ký'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '18px', color: '#6c757d', fontSize: '14px' }}>
            Đã có tài khoản? <Link to="/portal/login" style={{ color: '#0d9488', fontWeight: '600' }}>Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #e6fffa 0%, #f0fdfa 100%)', padding: '20px' };
const cardStyle = { background: '#fff', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(13,148,136,0.08)' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#134e48', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d1fae5', fontSize: '15px', color: '#134e48', outline: 'none', boxSizing: 'border-box' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#dc3545', fontSize: '14px', marginTop: '16px' };
const successBoxStyle = { background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#0d9488', fontSize: '14px', marginTop: '16px' };
const submitBtnStyle = { width: '100%', marginTop: '22px', padding: '13px', borderRadius: '25px', border: 'none', background: '#0d9488', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' };
