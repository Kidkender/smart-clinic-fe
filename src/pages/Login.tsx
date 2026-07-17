import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { loginApi } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusDialog, setStatusDialog] = useState<'pending' | 'locked' | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginApi(email, password);
      login(result.data.access_token, result.data.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'error.user.pending_approval') {
        setStatusDialog('pending');
      } else if (code === 'error.user.locked') {
        setStatusDialog('locked');
      } else {
        setError(resolveError(err, 'Sai email hoặc mật khẩu.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative flex flex-1 basis-[45%] items-center justify-center bg-[linear-gradient(160deg,#1c3a52_0%,#307bc4_100%)] p-12">
        <div className="max-w-[440px] text-white">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 no-underline">
            <span className="text-xl font-bold text-white">SmartClinic</span>
          </Link>
          <img
            src="/images/auth_hero.png"
            alt=""
            className="mb-7 w-full rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
          />
          <h2 className="m-0 mb-2 text-2xl font-bold">Chào mừng trở lại</h2>
          <p className="m-0 leading-relaxed opacity-85">
            Đăng nhập để tiếp tục quản lý bệnh nhân, lịch hẹn và hồ sơ khám chữa bệnh.
          </p>
        </div>
      </div>

      <div className="flex flex-1 basis-[55%] items-center justify-center bg-[#f4f7fa] p-5">
        <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <h1 className="mb-1 text-2xl font-bold text-[#1c3a52]">Đăng nhập</h1>
          <p className="mb-7 text-[#6c757d]">Nhập thông tin tài khoản của bạn</p>
          <form onSubmit={handleSubmit}>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@smartclinic.local"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <div className="mt-4 mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-semibold text-[#274760]">Mật khẩu</label>
              <Link to="/forgot-password" className="text-sm font-medium text-[#307bc4]">Quên mật khẩu?</Link>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {error && (
              <div className="mt-4 rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/8 px-4 py-3 text-sm text-[#dc3545]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-6 h-auto w-full rounded-full bg-[#307bc4] py-3.25 text-[15px] font-semibold text-white hover:bg-[#307bc4]/90"
            >
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>

            <p className="mt-5 text-center text-sm text-[#6c757d]">
              Chưa có tài khoản? <Link to="/register" className="font-semibold text-[#307bc4]">Đăng ký</Link>
            </p>
          </form>
        </div>
      </div>

      <Dialog open={statusDialog !== null} onOpenChange={open => { if (!open) setStatusDialog(null); }}>
        <DialogContent className="sm:max-w-[400px] rounded-[20px] p-7">
          {statusDialog === 'locked' ? (
            <div className="mb-4.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#dc3545]/12">
              <Icon icon="fa6-solid:lock" className="text-xl text-[#dc3545]" />
            </div>
          ) : (
            <div className="mb-4.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#d9a406]/12">
              <Icon icon="fa6-solid:hourglass-half" className="text-xl text-[#b8860b]" />
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="text-[19px] font-bold text-[#274760]">
              {statusDialog === 'locked' ? 'Tài khoản đã bị khóa' : 'Tài khoản đang chờ duyệt'}
            </DialogTitle>
          </DialogHeader>
          <p className="m-0 text-sm leading-relaxed text-[#6c757d]">
            {statusDialog === 'locked'
              ? 'Tài khoản của bạn đã bị quản trị viên khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
              : 'Tài khoản của bạn đã đăng ký thành công nhưng chưa được kích hoạt. Vui lòng đợi quản trị viên cấp quyền truy cập trước khi đăng nhập.'}
          </p>
          <Button
            type="button"
            onClick={() => setStatusDialog(null)}
            className="mt-5.5 h-auto w-full rounded-full bg-[#307bc4] py-3.25 text-[15px] font-semibold text-white hover:bg-[#307bc4]/90"
          >
            Đã hiểu
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
