import { useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordPatient, resetPasswordPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { maskEmail } from '@/utils/maskEmail';
import { useCountdown } from '@/hooks/useCountdown';
import { portalResetPasswordSchema, type PortalResetPasswordFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

const RESET_EMAIL_STORAGE_KEY = 'smartclinic_portal_reset_email';
const RESEND_COOLDOWN_SECONDS = 60;

export default function PortalResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email] = useState(
    () => (location.state as { email?: string } | null)?.email ?? sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY),
  );
  const [error, setError] = useState('');
  const [resendError, setResendError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const { secondsLeft, isActive, start } = useCountdown();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<PortalResetPasswordFormValues>({
    resolver: zodResolver(portalResetPasswordSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!email) {
      navigate('/portal/forgot-password', { replace: true, viewTransition: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await resetPasswordPatient(email, values.otp.trim(), values.newPassword);
      sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY);
      setDone(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  });

  const handleResend = async () => {
    setResendError('');
    setResending(true);
    try {
      await forgotPasswordPatient(email);
      start(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResendError(resolveError(err));
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY);
    navigate('/portal/forgot-password', { viewTransition: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#e6fffa_0%,#f0fdfa_100%)] p-5">
      <div className="w-full max-w-[400px]">
        <Link
          to="/portal/login"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#0d9488]/30 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#0d6b5f] no-underline shadow-sm hover:bg-[#0d9488]/5"
        >
          <Icon icon="fa6-solid:chevron-left" className="text-[11px]" />Quay lại đăng nhập
        </Link>
        <div className="rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(13,148,136,0.08)]">
          <h1 className="mb-1 text-[22px] font-bold text-[#134e48]">Đặt lại mật khẩu</h1>
          <p className="mb-6 text-sm text-[#6c757d]">
            Mã OTP đã được gửi tới <span className="font-semibold text-[#134e48]">{maskEmail(email)}</span>
          </p>

          {done ? (
            <div className="rounded-xl border border-[#0d9488]/30 bg-[#0d9488]/8 px-4.5 py-3.5 text-sm text-[#134e48]">
              Đặt lại mật khẩu thành công.{' '}
              <button
                type="button"
                onClick={() => navigate('/portal/login')}
                className="cursor-pointer font-semibold text-[#0d9488] underline"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} noValidate>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Mã OTP</label>
              <Input
                {...register('otp')}
                placeholder="6 chữ số đã gửi qua email"
                inputMode="numeric"
                maxLength={6}
                aria-invalid={!!errors.otp}
                className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
              />
              <FieldError message={errors.otp?.message} />
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Mật khẩu mới</label>
              <Input
                type="password"
                {...register('newPassword')}
                placeholder="Tối thiểu 8 ký tự"
                aria-invalid={!!errors.newPassword}
                className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
              />
              <FieldError message={errors.newPassword?.message} />
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Xác nhận mật khẩu</label>
              <Input
                type="password"
                {...register('confirmPassword')}
                placeholder="Nhập lại mật khẩu mới"
                aria-invalid={!!errors.confirmPassword}
                className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
              />
              <FieldError message={errors.confirmPassword?.message} />

              {error && <ErrorAlert variant="plain" className="mt-4">{error}</ErrorAlert>}
              {resendError && <ErrorAlert variant="plain" className="mt-4">{resendError}</ErrorAlert>}

              <Button
                type="submit"
                disabled={loading}
                className="mt-5.5 h-auto w-full rounded-xl bg-[#0d9488] py-3.25 text-[15px] font-semibold text-white hover:bg-[#0d9488]/90"
              >
                {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
              </Button>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="cursor-pointer font-semibold text-[#0d9488]"
                >
                  ← Đổi email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || isActive}
                  className="cursor-pointer font-semibold text-[#0d9488] disabled:cursor-not-allowed disabled:text-[#6c757d]"
                >
                  {isActive ? `Gửi lại OTP (${secondsLeft}s)` : resending ? 'Đang gửi…' : 'Gửi lại OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
