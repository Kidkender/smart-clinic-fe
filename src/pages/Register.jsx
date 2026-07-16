import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../api/auth';
import { resolveError } from '../utils/errorMessages';

export default function Register() {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerApi(email, password, fullname);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{
        flex: '1 1 45%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #1c3a52 0%, #307bc4 100%)', padding: '48px',
      }}>
        <div style={{ maxWidth: '440px', color: '#fff' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '32px' }}>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>SmartClinic</span>
          </Link>
          <img
            src="/images/auth_hero.png"
            alt=""
            style={{ width: '100%', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', marginBottom: '28px' }}
          />
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Tham gia đội ngũ</h2>
          <p style={{ opacity: 0.85, margin: 0, lineHeight: 1.6 }}>
            Tạo tài khoản để bắt đầu quản lý bệnh nhân, lịch hẹn và hồ sơ khám chữa bệnh.
          </p>
        </div>
      </div>

      <div style={{ flex: '1 1 55%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f7fa', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1c3a52', marginBottom: '4px' }}>Tạo tài khoản</h1>
          <p style={{ color: '#6c757d', marginBottom: '28px' }}>Đăng ký nhân sự mới cho phòng khám</p>
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Họ tên</label>
            <input required value={fullname} onChange={e => setFullname(e.target.value)} style={inputStyle} placeholder="Nguyễn Văn A" />
            <label style={labelStyle}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@smartclinic.local" />
            <label style={labelStyle}>Mật khẩu</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="Tối thiểu 8 ký tự" />

            {error && <div style={errorBoxStyle}>{error}</div>}
            {success && <div style={successBoxStyle}>Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập…</div>}

            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Đang tạo…' : 'Đăng ký'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '20px', color: '#6c757d', fontSize: '14px' }}>
              Đã có tài khoản? <Link to="/login" style={{ color: '#307bc4', fontWeight: '600' }}>Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8',
  fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box',
};
const errorBoxStyle = {
  background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)',
  borderRadius: '10px', padding: '12px 16px', color: '#dc3545', fontSize: '14px', marginTop: '16px',
};
const successBoxStyle = {
  background: 'rgba(25,135,84,0.08)', border: '1px solid rgba(25,135,84,0.3)',
  borderRadius: '10px', padding: '12px 16px', color: '#198754', fontSize: '14px', marginTop: '16px',
};
const submitBtnStyle = {
  width: '100%', marginTop: '24px', padding: '13px', borderRadius: '25px', border: 'none',
  background: '#307bc4', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
};
