import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { usePatientAuth } from '@/context/PatientAuthContext';
import { portalLoginSchema, type PortalLoginFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

export default function PortalLogin() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = usePatientAuth();
  const navigate = useNavigate();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<PortalLoginFormValues>({
    resolver: zodResolver(portalLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      const result = await loginPatient(values.email, values.password);
      login(result.data.access_token);
      navigate('/portal/home');
    } catch (err) {
      setError(resolveError(err, 'Sai email hoặc mật khẩu.'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#e6fffa_0%,#f0fdfa_100%)] p-5">
      <div className="w-full max-w-[400px]">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#0d9488]/30 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#0d6b5f] no-underline shadow-sm hover:bg-[#0d9488]/5"
        >
          <Icon icon="fa6-solid:chevron-left" className="text-[11px]" />Về trang chủ
        </Link>
        <div className="rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(13,148,136,0.08)]">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 no-underline opacity-90 transition-opacity hover:opacity-100">
            <Icon icon="fa6-solid:hospital" className="text-lg text-[#0d6b5f]" />
            <span className="text-lg font-bold text-[#0d6b5f]">SmartClinic</span>
            <span className="text-[13px] text-[#6c757d]">Cổng bệnh nhân</span>
          </Link>
          <h1 className="mb-1 text-[22px] font-bold text-[#134e48]">Đăng nhập</h1>
          <p className="mb-6 text-sm text-[#6c757d]">Xem và đặt lịch hẹn khám của bạn</p>
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Email</label>
            <Input
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
            />
            <FieldError message={errors.email?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Mật khẩu</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                aria-invalid={!!errors.password}
                className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 pr-10 text-[15px] text-[#134e48]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-[#6c757d]"
              >
                <Icon icon={showPassword ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'} className="text-sm" />
              </button>
            </div>
            <FieldError message={errors.password?.message} />

            {error && (
              <div className="mt-4 rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/8 px-4 py-3 text-sm text-[#dc3545]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-5.5 h-auto w-full rounded-xl bg-[#0d9488] py-3.25 text-[15px] font-semibold text-white hover:bg-[#0d9488]/90"
            >
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>

            <p className="mt-4.5 text-center text-sm text-[#6c757d]">
              Chưa có tài khoản? <Link to="/portal/register" className="font-semibold text-[#0d9488]">Đăng ký</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
