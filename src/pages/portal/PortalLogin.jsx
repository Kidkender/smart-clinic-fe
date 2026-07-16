import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginPatient } from '../../api/portal';
import { resolveError } from '../../utils/errorMessages';
import { usePatientAuth } from '../../context/PatientAuthContext';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = usePatientAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginPatient(email, password);
      login(result.data.access_token);
      navigate('/portal/home');
    } catch (err) {
      setError(resolveError(err, 'Sai email hoặc mật khẩu.'));
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
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#134e48', marginBottom: '4px' }}>Đăng nhập</h1>
        <p style={{ color: '#6c757d', marginBottom: '24px', fontSize: '14px' }}>Xem và đặt lịch hẹn khám của bạn</p>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Mật khẩu</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />

          {error && <div style={errorBoxStyle}>{error}</div>}

          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '18px', color: '#6c757d', fontSize: '14px' }}>
            Chưa có tài khoản? <Link to="/portal/register" style={{ color: '#0d9488', fontWeight: '600' }}>Đăng ký</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #e6fffa 0%, #f0fdfa 100%)', padding: '20px' };
const cardStyle = { background: '#fff', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(13,148,136,0.08)' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#134e48', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d1fae5', fontSize: '15px', color: '#134e48', outline: 'none', boxSizing: 'border-box' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#dc3545', fontSize: '14px', marginTop: '16px' };
const submitBtnStyle = { width: '100%', marginTop: '22px', padding: '13px', borderRadius: '25px', border: 'none', background: '#0d9488', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' };
