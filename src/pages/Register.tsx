import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerApi } from '@/api/auth';
import { resolveError } from '@/utils/errorMessages';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';

export default function Register() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullname: '', email: '', password: '' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await registerApi(values.email, values.password, values.fullname);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 basis-[45%] items-center justify-center bg-[linear-gradient(160deg,#1c3a52_0%,#307bc4_100%)] p-12">
        <div className="max-w-[440px] text-white">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 no-underline opacity-90 transition-opacity hover:opacity-100">
            <Icon icon="fa6-solid:hospital" className="text-xl text-[#63c4ff]" />
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
          <Button
            asChild
            variant="outline"
            className="mb-5 h-auto gap-1.5 rounded-full border-[#307bc4]/30 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#307bc4] shadow-sm hover:bg-[#307bc4]/5"
          >
            <Link to="/">
              <Icon icon="fa6-solid:chevron-left" className="text-[11px]" />Về trang chủ
            </Link>
          </Button>
          <h1 className="mb-1 text-2xl font-bold text-[#1c3a52]">Tạo tài khoản</h1>
          <p className="mb-7 text-[#6c757d]">Đăng ký nhân sự mới cho phòng khám</p>
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên</label>
            <Input
              {...register('fullname')}
              placeholder="Nguyễn Văn A"
              aria-invalid={!!errors.fullname}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.fullname?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Email</label>
            <Input
              type="email"
              {...register('email')}
              placeholder="you@smartclinic.local"
              aria-invalid={!!errors.email}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.email?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Tối thiểu 8 ký tự"
                aria-invalid={!!errors.password}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 pr-10 text-[15px] text-[#274760]"
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

            {error && <ErrorAlert variant="plain" className="mt-4">{error}</ErrorAlert>}
            {success && (
              <div className="mt-4 rounded-lg border border-[#198754]/30 bg-[#198754]/8 px-4 py-3 text-sm text-[#198754]">
                Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập…
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              size="cta-block-lg" className="mt-6"
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
