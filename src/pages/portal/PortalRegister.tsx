import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { portalRegisterSchema, type PortalRegisterFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PortalRegister() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register, control, handleSubmit, formState: { errors },
  } = useForm<PortalRegisterFormValues>({
    resolver: zodResolver(portalRegisterSchema),
    defaultValues: { fullname: '', email: '', password: '', phone: '', cccd: '', gender: 'other' },
  });

  const handleFormSubmit = handleSubmit(async values => {
    setError('');
    setLoading(true);
    try {
      await registerPatient({ ...values, fullname: values.fullname.trim() });
      setSuccess(true);
      setTimeout(() => navigate('/portal/login'), 1200);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#e6fffa_0%,#f0fdfa_100%)] p-5">
      <div className="w-full max-w-[420px]">
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
        <h1 className="mb-1 text-[22px] font-bold text-[#134e48]">Tạo tài khoản</h1>
        <p className="mb-6 text-sm text-[#6c757d]">Đăng ký để tự đặt lịch khám</p>
        <form onSubmit={handleFormSubmit} noValidate>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Họ tên *</label>
          <Input
            {...register('fullname')}
            aria-invalid={!!errors.fullname}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />
          <FieldError message={errors.fullname?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Email *</label>
          <Input
            type="email"
            {...register('email')}
            aria-invalid={!!errors.email}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />
          <FieldError message={errors.email?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Mật khẩu *</label>
          <Input
            type="password"
            {...register('password')}
            placeholder="Tối thiểu 8 ký tự"
            aria-invalid={!!errors.password}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />
          <FieldError message={errors.password?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Giới tính *</label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Nam</SelectItem>
                  <SelectItem value="female">Nữ</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Số điện thoại *</label>
          <Input
            {...register('phone')}
            placeholder="VD: 0912345678"
            aria-invalid={!!errors.phone}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />
          <FieldError message={errors.phone?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">CCCD</label>
          <Input
            {...register('cccd')}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />

          {error && (
            <div className="mt-4 rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/8 px-4 py-3 text-sm text-[#dc3545]">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-lg border border-[#0d9488]/30 bg-[#0d9488]/8 px-4 py-3 text-sm text-[#0d9488]">
              Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập…
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-5.5 h-auto w-full rounded-xl bg-[#0d9488] py-3.25 text-[15px] font-semibold text-white hover:bg-[#0d9488]/90"
          >
            {loading ? 'Đang tạo…' : 'Đăng ký'}
          </Button>

          <p className="mt-4.5 text-center text-sm text-[#6c757d]">
            Đã có tài khoản? <Link to="/portal/login" className="font-semibold text-[#0d9488]">Đăng nhập</Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}
