import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { portalForgotPasswordSchema, type PortalForgotPasswordFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

export default function PortalForgotPassword() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<PortalForgotPasswordFormValues>({
    resolver: zodResolver(portalForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await forgotPasswordPatient(values.email);
      navigate(`/portal/reset-password?email=${encodeURIComponent(values.email)}`, { viewTransition: true });
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
          <h1 className="mb-1 text-[22px] font-bold text-[#134e48]">Quên mật khẩu</h1>
          <p className="mb-6 text-sm text-[#6c757d]">
            Nhập email tài khoản, hệ thống sẽ gửi mã xác thực (OTP) gồm 6 chữ số qua email.
          </p>

          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Email</label>
            <Input
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
            />
            <FieldError message={errors.email?.message} />

            {error && <ErrorAlert variant="plain" className="mt-4">{error}</ErrorAlert>}

            <Button
              type="submit"
              disabled={loading}
              className="mt-5.5 h-auto w-full rounded-xl bg-[#0d9488] py-3.25 text-[15px] font-semibold text-white hover:bg-[#0d9488]/90"
            >
              {loading ? 'Đang gửi…' : 'Gửi mã OTP'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
