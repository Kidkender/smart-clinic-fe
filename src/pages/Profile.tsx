import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getMe, updateProfile, changePasswordApi } from '@/api/auth';
import { getDepartments } from '@/api/department';
import { getDoctor } from '@/api/doctor';
import { resolveError } from '@/utils/errorMessages';
import { roleLabel, userStatusLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schemas/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import FieldError from '@/components/FieldError';

interface Me {
  ID: number | string;
  Fullname: string;
  Email: string;
  Role: string;
  Status: string;
  DepartmentID?: number | string | null;
  CreatedAt?: string;
}

interface Department {
  ID: number | string;
  Name: string;
}

interface DoctorProfile {
  Specialty: string;
  LicenseNo?: string;
  Qualification?: string;
  Institution?: string;
  YearsExperience: number;
  Bio?: string;
}

export default function Profile() {
  const { setFullname: setAuthFullname } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const {
    register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '' },
  });

  const handleChangePassword = handlePasswordSubmit(async values => {
    setPasswordError('');
    setPasswordSaved(false);
    setChangingPassword(true);
    try {
      await changePasswordApi(values.oldPassword, values.newPassword);
      resetPasswordForm();
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(resolveError(err));
    } finally {
      setChangingPassword(false);
    }
  });

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([getMe(), getDepartments()])
      .then(([meRes, deptRes]) => {
        setMe(meRes.data);
        setDepartments(deptRes.data ?? []);
        if (meRes.data.Role === 'doctor') {
          getDoctor(meRes.data.ID).then(r => setDoctorProfile(r.data?.profile ?? null)).catch(() => setDoctorProfile(null));
        }
      })
      .catch(err => setError(resolveError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const departmentName = (id?: number | string | null) =>
    departments.find(d => String(d.ID) === String(id))?.Name ?? '—';

  const openEdit = () => {
    setNameValue(me?.Fullname ?? '');
    setFormError('');
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setFormError('Vui lòng nhập họ tên.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const result = await updateProfile(trimmed);
      setMe(result.data);
      setAuthFullname(trimmed);
      setEditing(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }

  if (error || !me) {
    return <ErrorAlert>{error || 'Không tải được hồ sơ.'}</ErrorAlert>;
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hồ sơ cá nhân</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Thông tin tài khoản của bạn</p>
      </div>

      <Card className="max-w-[560px] rounded-2xl border-[#e8edf2] p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex size-[64px] shrink-0 items-center justify-center rounded-full bg-[#307bc4]/10 text-2xl font-bold text-[#307bc4]">
            {me.Fullname.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-[#274760]">{me.Fullname}</div>
            <div className="truncate text-sm text-[#6c757d]">{me.Email}</div>
          </div>
        </div>

        {!editing ? (
          <>
            <dl className="m-0 grid grid-cols-[140px_1fr] gap-y-3.5 text-sm">
              <dt className="text-[#6c757d]">Vai trò</dt>
              <dd className="m-0 text-[#274760]"><Badge variant="secondary">{roleLabel(me.Role)}</Badge></dd>

              <dt className="text-[#6c757d]">Khoa/Phòng</dt>
              <dd className="m-0 text-[#274760]">{departmentName(me.DepartmentID)}</dd>

              <dt className="text-[#6c757d]">Trạng thái</dt>
              <dd className="m-0 text-[#274760]">
                <Badge variant={me.Status === 'active' ? 'secondary' : 'outline'}>{userStatusLabel(me.Status)}</Badge>
              </dd>

              {me.CreatedAt && (
                <>
                  <dt className="text-[#6c757d]">Ngày tham gia</dt>
                  <dd className="m-0 text-[#274760]">{new Date(me.CreatedAt).toLocaleDateString('vi-VN')}</dd>
                </>
              )}
            </dl>

            {me.Role === 'doctor' && doctorProfile && (
              <>
                <div className="mt-6 mb-3.5 border-t border-[#f0f4f8] pt-5 text-sm font-bold text-[#274760]">
                  Hồ sơ chuyên môn
                </div>
                <dl className="m-0 grid grid-cols-[140px_1fr] gap-y-3.5 text-sm">
                  <dt className="text-[#6c757d]">Chuyên khoa</dt>
                  <dd className="m-0 text-[#274760]">{doctorProfile.Specialty || '—'}</dd>

                  <dt className="text-[#6c757d]">Kinh nghiệm</dt>
                  <dd className="m-0 text-[#274760]">{doctorProfile.YearsExperience} năm</dd>

                  <dt className="text-[#6c757d]">Bằng cấp</dt>
                  <dd className="m-0 text-[#274760]">{doctorProfile.Qualification || '—'}</dd>

                  <dt className="text-[#6c757d]">Nơi đào tạo</dt>
                  <dd className="m-0 text-[#274760]">{doctorProfile.Institution || '—'}</dd>

                  <dt className="text-[#6c757d]">Số CCHN</dt>
                  <dd className="m-0 text-[#274760]">{doctorProfile.LicenseNo || '—'}</dd>

                  {doctorProfile.Bio && (
                    <>
                      <dt className="text-[#6c757d]">Giới thiệu</dt>
                      <dd className="m-0 text-[#274760]">{doctorProfile.Bio}</dd>
                    </>
                  )}
                </dl>
              </>
            )}

            {me.Role === 'admin' ? (
              <p className="mt-6 text-[13px] text-[#6c757d]">
                Tài khoản quản trị hệ thống không được đổi thay đổi thông tin.
              </p>
            ) : (
              <Button
                onClick={openEdit}
                size="cta" className="mt-6"
              >
                <Icon icon="fa6-solid:pen" className="text-xs" /> Sửa họ tên
              </Button>
            )}
          </>
        ) : (
          <form onSubmit={handleSave} noValidate>
            <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên *</label>
            <Input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="cta"
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="mt-5 max-w-[560px] rounded-2xl border-[#e8edf2] p-8">
        <h2 className="m-0 mb-1 text-lg font-bold text-[#274760]">Đổi mật khẩu</h2>
        <p className="mt-0 mb-5 text-sm text-[#6c757d]">Nhập mật khẩu hiện tại và mật khẩu mới.</p>
        <form onSubmit={handleChangePassword} noValidate>
          <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu hiện tại *</label>
          <div className="relative">
            <Input
              type={showOldPassword ? 'text' : 'password'}
              {...registerPassword('oldPassword')}
              aria-invalid={!!passwordErrors.oldPassword}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 pr-10 text-[15px] text-[#274760]"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(v => !v)}
              title={showOldPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-[#6c757d]"
            >
              <Icon icon={showOldPassword ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'} className="text-sm" />
            </button>
          </div>
          <FieldError message={passwordErrors.oldPassword?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu mới *</label>
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              {...registerPassword('newPassword')}
              placeholder="Tối thiểu 8 ký tự"
              aria-invalid={!!passwordErrors.newPassword}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 pr-10 text-[15px] text-[#274760]"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(v => !v)}
              title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-[#6c757d]"
            >
              <Icon icon={showNewPassword ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'} className="text-sm" />
            </button>
          </div>
          <FieldError message={passwordErrors.newPassword?.message} />

          {passwordError && <ErrorAlert icon={false} className="mt-4">{passwordError}</ErrorAlert>}
          {passwordSaved && (
            <div className="mt-4 text-[13px] font-semibold text-[#198754]">Đã đổi mật khẩu thành công.</div>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={changingPassword} size="cta">
              {changingPassword ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
