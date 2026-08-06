import { useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordApi, resetPasswordApi } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { maskEmail } from '@/utils/maskEmail';
import { useCountdown } from '@/hooks/useCountdown';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

const RESET_EMAIL_STORAGE_KEY = 'smartclinic_reset_email';
const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPassword() {
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
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true, viewTransition: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await resetPasswordApi(email, values.otp.trim(), values.newPassword);
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
      await forgotPasswordApi(email);
      start(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResendError(resolveError(err));
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY);
    navigate('/forgot-password', { viewTransition: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fa] p-5">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <h1 className="mb-1 text-2xl font-bold text-[#1c3a52]">Đặt lại mật khẩu</h1>
        <p className="mb-7 text-[#6c757d]">
          Mã OTP đã được gửi tới <span className="font-semibold text-[#274760]">{maskEmail(email)}</span>
        </p>

        {done ? (
          <div className="rounded-xl border border-[#198754]/30 bg-[#198754]/8 px-4.5 py-3.5 text-sm text-[#274760]">
            Đặt lại mật khẩu thành công.{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="cursor-pointer font-semibold text-[#307bc4] underline"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mã OTP</label>
            <Input
              {...register('otp')}
              placeholder="6 chữ số đã gửi qua email"
              inputMode="numeric"
              maxLength={6}
              aria-invalid={!!errors.otp}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.otp?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu mới</label>
            <Input
              type="password"
              {...register('newPassword')}
              placeholder="Tối thiểu 8 ký tự"
              aria-invalid={!!errors.newPassword}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.newPassword?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Xác nhận mật khẩu</label>
            <Input
              type="password"
              {...register('confirmPassword')}
              placeholder="Nhập lại mật khẩu mới"
              aria-invalid={!!errors.confirmPassword}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.confirmPassword?.message} />

            {error && <ErrorAlert variant="plain" className="mt-4">{error}</ErrorAlert>}
            {resendError && <ErrorAlert variant="plain" className="mt-4">{resendError}</ErrorAlert>}

            <Button
              type="submit"
              disabled={loading}
              size="cta-block-lg" className="mt-6"
            >
              {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
            </Button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="cursor-pointer font-semibold text-[#307bc4]"
              >
                ← Đổi email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || isActive}
                className="cursor-pointer font-semibold text-[#307bc4] disabled:cursor-not-allowed disabled:text-[#6c757d]"
              >
                {isActive ? `Gửi lại OTP (${secondsLeft}s)` : resending ? 'Đang gửi…' : 'Gửi lại OTP'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[#6c757d]">
          <Link to="/login" className="font-semibold text-[#307bc4]">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
