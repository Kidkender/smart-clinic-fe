import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { portalResetPasswordSchema, type PortalResetPasswordFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

export default function PortalResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<PortalResetPasswordFormValues>({
    resolver: zodResolver(portalResetPasswordSchema),
    defaultValues: { email: searchParams.get('email') ?? '', otp: '', newPassword: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await resetPasswordPatient(values.email.trim(), values.otp.trim(), values.newPassword);
      setDone(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  });

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
          <p className="mb-6 text-sm text-[#6c757d]">Nhập mã OTP đã gửi qua email và mật khẩu mới.</p>

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
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Email</label>
              <Input
                type="email"
                {...register('email')}
                aria-invalid={!!errors.email}
                className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
              />
              <FieldError message={errors.email?.message} />
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

              {error && <ErrorAlert variant="plain" className="mt-4">{error}</ErrorAlert>}

              <Button
                type="submit"
                disabled={loading}
                className="mt-5.5 h-auto w-full rounded-xl bg-[#0d9488] py-3.25 text-[15px] font-semibold text-white hover:bg-[#0d9488]/90"
              >
                {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
