import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Register() {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
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
    <div className="flex min-h-screen">
      <div className="flex flex-1 basis-[45%] items-center justify-center bg-[linear-gradient(160deg,#1c3a52_0%,#307bc4_100%)] p-12">
        <div className="max-w-[440px] text-white">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 no-underline">
            <span className="text-xl font-bold text-white">SmartClinic</span>
          </Link>
          <img
            src="/images/auth_hero.png"
            alt=""
            className="mb-7 w-full rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
          />
          <h2 className="m-0 mb-2 text-2xl font-bold">Tham gia đội ngũ</h2>
          <p className="m-0 leading-relaxed opacity-85">
            Tạo tài khoản để bắt đầu quản lý bệnh nhân, lịch hẹn và hồ sơ khám chữa bệnh.
          </p>
        </div>
      </div>

      <div className="flex flex-1 basis-[55%] items-center justify-center bg-[#f4f7fa] p-5">
        <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <h1 className="mb-1 text-2xl font-bold text-[#1c3a52]">Tạo tài khoản</h1>
          <p className="mb-7 text-[#6c757d]">Đăng ký nhân sự mới cho phòng khám</p>
          <form onSubmit={handleSubmit}>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên</label>
            <Input
              required
              value={fullname}
              onChange={e => setFullname(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@smartclinic.local"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu</label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {error && (
              <div className="mt-4 rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/8 px-4 py-3 text-sm text-[#dc3545]">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 rounded-lg border border-[#198754]/30 bg-[#198754]/8 px-4 py-3 text-sm text-[#198754]">
                Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập…
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-6 h-auto w-full rounded-full bg-[#307bc4] py-3.25 text-[15px] font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {loading ? 'Đang tạo…' : 'Đăng ký'}
            </Button>

            <p className="mt-5 text-center text-sm text-[#6c757d]">
              Đã có tài khoản? <Link to="/login" className="font-semibold text-[#307bc4]">Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
