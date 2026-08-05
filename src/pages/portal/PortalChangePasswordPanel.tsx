import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import { changePasswordPatient } from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { portalChangePasswordSchema, type PortalChangePasswordFormValues } from '@/schemas/portal';
import { PORTAL_LABEL, PORTAL_INPUT } from './constants';

export default function PortalChangePasswordPanel() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<PortalChangePasswordFormValues>({
    resolver: zodResolver(portalChangePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '' },
  });

  const onSubmit = handleSubmit(async values => {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await changePasswordPatient(values.oldPassword, values.newPassword);
      reset();
      setSaved(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="mt-5">
      <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Đổi mật khẩu</h2>
      <Card className="rounded-2xl border-[#d1fae5] p-5">
        <form onSubmit={onSubmit} noValidate>
          <label className={PORTAL_LABEL}>Mật khẩu hiện tại</label>
          <Input
            type="password"
            {...register('oldPassword')}
            aria-invalid={!!errors.oldPassword}
            className={PORTAL_INPUT}
          />
          <FieldError message={errors.oldPassword?.message} />
          <label className={PORTAL_LABEL}>Mật khẩu mới</label>
          <Input
            type="password"
            {...register('newPassword')}
            placeholder="Tối thiểu 8 ký tự"
            aria-invalid={!!errors.newPassword}
            className={PORTAL_INPUT}
          />
          <FieldError message={errors.newPassword?.message} />

          {error && <ErrorAlert className="mt-4">{error}</ErrorAlert>}
          {saved && (
            <div className="mt-4 text-[13px] font-semibold text-[#0d9488]">
              Đã đổi mật khẩu thành công.
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="mt-5 h-auto w-full justify-center rounded-xl bg-[#0d9488] py-3 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
          >
            {saving ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
