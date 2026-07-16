import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

const FEATURES = [
  { icon: 'fa6-solid:user-injured', title: 'Quản lý bệnh nhân', desc: 'Hồ sơ, MRN, tiền sử dị ứng và người liên hệ.' },
  { icon: 'fa6-solid:calendar-days', title: 'Đặt lịch & Tiếp nhận', desc: 'Đặt lịch hẹn, hàng đợi khám tự động theo khoa.' },
  { icon: 'fa6-solid:stethoscope', title: 'Khám ngoại trú', desc: 'Sinh hiệu, chẩn đoán ICD-10, kê đơn thuốc.' },
  { icon: 'fa6-solid:file-invoice-dollar', title: 'Viện phí', desc: 'Tự động tổng hợp chi phí khám, CLS và thuốc.' },
];

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fa' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px', background: '#fff', borderBottom: '1px solid #e8edf2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon icon="fa6-solid:hospital" style={{ fontSize: '22px', color: '#307bc4' }} />
          <span style={{ fontSize: '19px', fontWeight: '700', color: '#1c3a52' }}>SmartClinic</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/portal/login" style={secondaryLinkStyle}>Cổng bệnh nhân</Link>
          <Link to="/login" style={secondaryLinkStyle}>Đăng nhập</Link>
          <Link to="/register" style={primaryLinkStyle}>Đăng ký</Link>
        </div>
      </header>

      <section style={{
        display: 'flex', alignItems: 'center', gap: '48px',
        maxWidth: '1120px', margin: '0 auto', padding: '72px 24px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 420px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '800', color: '#1c3a52', lineHeight: 1.15, margin: 0 }}>
            Hệ thống quản lý bệnh viện <span style={{ color: '#307bc4' }}>SmartClinic</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#6c757d', marginTop: '20px', lineHeight: 1.6 }}>
            Chuẩn hóa quy trình tiếp nhận, khám ngoại trú, kê đơn thuốc và viện phí cho phòng khám,
            bệnh viện đa khoa quy mô vừa và lớn.
          </p>
          <div style={{ marginTop: '32px', display: 'flex', gap: '14px' }}>
            <Link to="/login" style={{ ...primaryLinkStyle, padding: '14px 28px', fontSize: '15px' }}>
              Vào hệ thống
            </Link>
          </div>
        </div>
        <div style={{ flex: '1 1 380px', textAlign: 'center' }}>
          <img
            src="/images/home_hero.jpeg"
            alt="SmartClinic"
            style={{ width: '100%', maxWidth: '420px', borderRadius: '24px', boxShadow: '0 20px 60px rgba(28,58,82,0.15)' }}
          />
        </div>
      </section>

      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px 72px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #e8edf2' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(48,123,196,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              }}>
                <Icon icon={f.icon} style={{ fontSize: '20px', color: '#307bc4' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#274760', margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: '#6c757d', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const primaryLinkStyle = {
  padding: '10px 20px', borderRadius: '25px', background: '#307bc4', color: '#fff',
  textDecoration: 'none', fontSize: '14px', fontWeight: '600',
};
const secondaryLinkStyle = {
  padding: '10px 20px', borderRadius: '25px', border: '1px solid #dde2e8', color: '#274760',
  textDecoration: 'none', fontSize: '14px', fontWeight: '500',
};
