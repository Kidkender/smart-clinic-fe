import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordApi } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

export default function ForgotPassword() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(values.email);
      setSent(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fa] p-5">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <h1 className="mb-1 text-2xl font-bold text-[#1c3a52]">Quên mật khẩu</h1>
        <p className="mb-7 text-[#6c757d]">
          Nhập email tài khoản, quản trị hệ thống sẽ cấp liên kết đặt lại mật khẩu.
        </p>

        {sent ? (
          <div className="rounded-xl border border-[#307bc4]/30 bg-[#307bc4]/8 px-4.5 py-3.5 text-sm text-[#274760]">
            Nếu email tồn tại trong hệ thống, yêu cầu đặt lại mật khẩu đã được ghi nhận.
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Email</label>
            <Input
              type="email"
              {...register('email')}
              placeholder="you@smartclinic.local"
              aria-invalid={!!errors.email}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.email?.message} />

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
              {loading ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[#6c757d]">
          <Link to="/login" className="font-semibold text-[#307bc4]">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
