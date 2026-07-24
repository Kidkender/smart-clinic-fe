import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordApi } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: searchParams.get('token') ?? '', newPassword: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await resetPasswordApi(values.token.trim(), values.newPassword);
      setDone(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fa] p-5">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <h1 className="mb-1 text-2xl font-bold text-[#1c3a52]">Đặt lại mật khẩu</h1>
        <p className="mb-7 text-[#6c757d]">Nhập mã đặt lại và mật khẩu mới cho tài khoản.</p>

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
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mã đặt lại</label>
            <Input
              {...register('token')}
              placeholder="Mã được cấp từ quản trị viên"
              aria-invalid={!!errors.token}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.token?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu mới</label>
            <Input
              type="password"
              {...register('newPassword')}
              placeholder="Tối thiểu 8 ký tự"
              aria-invalid={!!errors.newPassword}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.newPassword?.message} />

            {error && <ErrorAlert variant="plain" className="mt-4">{error}</ErrorAlert>}

            <Button
              type="submit"
              disabled={loading}
              size="cta-block-lg" className="mt-6"
            >
              {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
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
