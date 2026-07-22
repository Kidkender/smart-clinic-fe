import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getPublicDepartments } from '@/api/portal';
import { cn } from '@/lib/utils';

interface Department {
  ID: number | string;
  Name: string;
}

const FEATURES = [
  { icon: 'fa6-solid:user-injured', title: 'Quản lý bệnh nhân', desc: 'Hồ sơ, MRN, tiền sử dị ứng và người liên hệ.' },
  { icon: 'fa6-solid:calendar-days', title: 'Đặt lịch & Tiếp nhận', desc: 'Đặt lịch hẹn, hàng đợi khám tự động theo khoa.' },
  { icon: 'fa6-solid:stethoscope', title: 'Khám ngoại trú', desc: 'Sinh hiệu, chẩn đoán ICD-10, kê đơn thuốc.' },
  { icon: 'fa6-solid:file-invoice-dollar', title: 'Viện phí', desc: 'Tự động tổng hợp chi phí khám, CLS và thuốc.' },
];

const NAV_LINKS = [
  { href: '#top', label: 'Trang chủ' },
  { href: '#departments', label: 'Chuyên khoa' },
  { href: '#contact', label: 'Liên hệ' },
];

const navLinkClass = 'text-sm font-medium text-[#274760]/70 no-underline hover:text-[#274760]';
const primaryLinkClass = 'rounded-full bg-[#307bc4] px-5 py-2.5 text-sm font-semibold text-white no-underline';
const staffLinkClass = 'text-sm font-medium text-[#6c757d] no-underline hover:text-[#274760]';

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getPublicDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  return (
    <div id="top" className="min-h-screen bg-[#f4f7fa]">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#e8edf2] bg-white/95 px-6 py-4 backdrop-blur sm:px-12">
        <div className="flex items-center gap-2.5">
          <Icon icon="fa6-solid:hospital" className="text-[22px] text-[#307bc4]" />
          <span className="text-[19px] font-bold text-[#1c3a52]">SmartClinic</span>
        </div>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className={navLinkClass}>{l.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className={staffLinkClass}>Cổng nhân viên</Link>
          <Link to="/portal/login" className={primaryLinkClass}>Đặt lịch khám</Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-12 px-6 py-18">
        <div className="flex-1 basis-[420px]">
          <h1 className="m-0 text-[42px] leading-[1.15] font-extrabold text-[#1c3a52]">
            Đặt lịch khám <span className="text-[#307bc4]">trực tuyến</span>
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#6c757d]">
            Đặt lịch với bác sĩ chỉ trong vài phút. Theo dõi hồ sơ khám, đơn thuốc và kết quả xét nghiệm ngay trên cổng bệnh nhân.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/portal/register" className={cn(primaryLinkClass, 'px-7 py-3.5 text-[15px]')}>
              Đặt lịch ngay
            </Link>
            <span className="text-sm text-[#6c757d]">
              Đã có tài khoản? <Link to="/portal/login" className="font-semibold text-[#307bc4] no-underline hover:underline">Đăng nhập bệnh nhân</Link>
            </span>
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

      {departments.length > 0 && (
        <section id="departments" className="border-t border-[#e8edf2] bg-white px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-[1120px]">
            <h2 className="m-0 mb-2 text-[26px] font-bold text-[#1c3a52]">Chuyên khoa</h2>
            <p className="mt-0 mb-8 text-[15px] text-[#6c757d]">Chọn chuyên khoa phù hợp để đặt lịch khám nhanh hơn.</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              {departments.map(d => (
                <Link
                  key={d.ID}
                  to="/portal/register"
                  className="flex items-center gap-3 rounded-xl border border-[#e8edf2] px-4.5 py-3.5 no-underline hover:border-[#307bc4]/40 hover:bg-[#307bc4]/5"
                >
                  <Icon icon="fa6-solid:notes-medical" className="text-lg text-[#307bc4]" />
                  <span className="text-sm font-semibold text-[#274760]">{d.Name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="contact" className="px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="m-0 mb-2 text-[26px] font-bold text-[#1c3a52]">Liên hệ</h2>
          <p className="mt-0 mb-8 text-[15px] text-[#6c757d]">Cần hỗ trợ đặt lịch hoặc tư vấn? Liên hệ với chúng tôi.</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              <Icon icon="fa6-solid:phone" className="mb-3 text-xl text-[#307bc4]" />
              <div className="text-sm font-bold text-[#274760]">Hotline</div>
              <div className="mt-1 text-sm text-[#6c757d]">1900 1234</div>
            </div>
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              <Icon icon="fa6-solid:envelope" className="mb-3 text-xl text-[#307bc4]" />
              <div className="text-sm font-bold text-[#274760]">Email</div>
              <div className="mt-1 text-sm text-[#6c757d]">support@smartclinic.vn</div>
            </div>
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              <Icon icon="fa6-solid:location-dot" className="mb-3 text-xl text-[#307bc4]" />
              <div className="text-sm font-bold text-[#274760]">Địa chỉ</div>
              <div className="mt-1 text-sm text-[#6c757d]">123 Đường Sức Khỏe, TP.HCM</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e8edf2] bg-white px-6 py-6 text-center text-[13px] text-[#6c757d] sm:px-12">
        <div>SmartClinic v{__APP_VERSION__}</div>
        <div className="mt-2">
          Dành cho nhân viên y tế? <Link to="/login" className="font-semibold text-[#307bc4] no-underline hover:underline">Truy cập Cổng nhân viên</Link>
        </div>
      </footer>
    </div>
  );
}
