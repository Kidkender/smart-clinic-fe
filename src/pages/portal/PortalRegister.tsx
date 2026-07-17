import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PortalRegister() {
  const [form, setForm] = useState({ fullname: '', email: '', password: '', phone: '', cccd: '', gender: 'other' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerPatient(form);
      setSuccess(true);
      setTimeout(() => navigate('/portal/login'), 1200);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#e6fffa_0%,#f0fdfa_100%)] p-5">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-10 shadow-[0_10px_40px_rgba(13,148,136,0.08)]">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 no-underline">
          <span className="text-lg font-bold text-[#0d6b5f]">SmartClinic</span>
          <span className="text-[13px] text-[#6c757d]">Cổng bệnh nhân</span>
        </Link>
        <h1 className="mb-1 text-[22px] font-bold text-[#134e48]">Tạo tài khoản</h1>
        <p className="mb-6 text-sm text-[#6c757d]">Đăng ký để tự đặt lịch khám</p>
        <form onSubmit={handleSubmit}>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Họ tên *</label>
          <Input
            required
            value={form.fullname}
            onChange={e => setForm({ ...form, fullname: e.target.value })}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Email *</label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Mật khẩu *</label>
          <Input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Tối thiểu 8 ký tự"
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Giới tính *</label>
          <Select value={form.gender} onValueChange={value => setForm({ ...form, gender: value })}>
            <SelectTrigger className="h-auto w-full rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Nam</SelectItem>
              <SelectItem value="female">Nữ</SelectItem>
              <SelectItem value="other">Khác</SelectItem>
            </SelectContent>
          </Select>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">Số điện thoại</label>
          <Input
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="h-auto rounded-xl border-[#d1fae5] px-4 py-3 text-[15px] text-[#134e48]"
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#134e48]">CCCD</label>
          <Input
            value={form.cccd}
            onChange={e => setForm({ ...form, cccd: e.target.value })}
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
            className="mt-5.5 h-auto w-full rounded-full bg-[#0d9488] py-3.25 text-[15px] font-semibold text-white hover:bg-[#0d9488]/90"
          >
            {loading ? 'Đang tạo…' : 'Đăng ký'}
          </Button>

          <p className="mt-4.5 text-center text-sm text-[#6c757d]">
            Đã có tài khoản? <Link to="/portal/login" className="font-semibold text-[#0d9488]">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
