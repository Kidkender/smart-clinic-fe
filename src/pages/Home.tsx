import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: 'fa6-solid:user-injured', title: 'Quản lý bệnh nhân', desc: 'Hồ sơ, MRN, tiền sử dị ứng và người liên hệ.' },
  { icon: 'fa6-solid:calendar-days', title: 'Đặt lịch & Tiếp nhận', desc: 'Đặt lịch hẹn, hàng đợi khám tự động theo khoa.' },
  { icon: 'fa6-solid:stethoscope', title: 'Khám ngoại trú', desc: 'Sinh hiệu, chẩn đoán ICD-10, kê đơn thuốc.' },
  { icon: 'fa6-solid:file-invoice-dollar', title: 'Viện phí', desc: 'Tự động tổng hợp chi phí khám, CLS và thuốc.' },
];

const primaryLinkClass = 'rounded-full bg-[#307bc4] px-5 py-2.5 text-sm font-semibold text-white no-underline';
const secondaryLinkClass = 'rounded-full border border-[#dde2e8] px-5 py-2.5 text-sm font-medium text-[#274760] no-underline';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <header className="flex items-center justify-between border-b border-[#e8edf2] bg-white px-12 py-5">
        <div className="flex items-center gap-2.5">
          <Icon icon="fa6-solid:hospital" className="text-[22px] text-[#307bc4]" />
          <span className="text-[19px] font-bold text-[#1c3a52]">SmartClinic</span>
        </div>
        <div className="flex gap-3">
          <Link to="/portal/login" className={secondaryLinkClass}>Cổng bệnh nhân</Link>
          <Link to="/login" className={secondaryLinkClass}>Đăng nhập</Link>
          <Link to="/register" className={primaryLinkClass}>Đăng ký</Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-12 px-6 py-18">
        <div className="flex-1 basis-[420px]">
          <h1 className="m-0 text-[42px] leading-[1.15] font-extrabold text-[#1c3a52]">
            Hệ thống quản lý bệnh viện <span className="text-[#307bc4]">SmartClinic</span>
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#6c757d]">
            Chuẩn hóa quy trình tiếp nhận, khám ngoại trú, kê đơn thuốc và viện phí cho phòng khám,
            bệnh viện đa khoa quy mô vừa và lớn.
          </p>
          <div className="mt-8 flex gap-3.5">
            <Link to="/login" className={cn(primaryLinkClass, 'px-7 py-3.5 text-[15px]')}>
              Vào hệ thống
            </Link>
          </div>
        </div>
        <div className="flex-1 basis-[380px] text-center">
          <img
            src="/images/home_hero.jpeg"
            alt="SmartClinic"
            className="w-full max-w-[420px] rounded-3xl shadow-[0_20px_60px_rgba(28,58,82,0.15)]"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-18">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border border-[#e8edf2] bg-white p-7">
              <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-[#307bc4]/10">
                <Icon icon={f.icon} className="text-xl text-[#307bc4]" />
              </div>
              <h3 className="m-0 mb-1.5 text-base font-bold text-[#274760]">{f.title}</h3>
              <p className="m-0 text-sm leading-relaxed text-[#6c757d]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#e8edf2] bg-white px-12 py-6 text-center text-[13px] text-[#6c757d]">
        SmartClinic v{__APP_VERSION__}
      </footer>
    </div>
  );
}
