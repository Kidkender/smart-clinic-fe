import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import type { PortalProfileFormValues } from '@/schemas/portal';
import { PORTAL_LABEL, PORTAL_INPUT } from './constants';

export default function PortalProfilePanel({
  register,
  errors,
  onSubmit,
  saving,
  error,
  saved,
}: {
  register: UseFormRegister<PortalProfileFormValues>;
  errors: FieldErrors<PortalProfileFormValues>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  saving: boolean;
  error: string;
  saved: boolean;
}) {
  return (
    <div className="mt-5">
      <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Hồ sơ của tôi</h2>
      <Card className="rounded-2xl border-[#d1fae5] p-5">
        <form onSubmit={onSubmit} noValidate>
          <label className={PORTAL_LABEL}>Số điện thoại</label>
          <Input
            {...register('phone')}
            aria-invalid={!!errors.phone}
            className={PORTAL_INPUT}
          />
          <FieldError message={errors.phone?.message} />
          <label className={PORTAL_LABEL}>Địa chỉ</label>
          <Input
            {...register('address')}
            className={PORTAL_INPUT}
          />
          <label className={PORTAL_LABEL}>Số thẻ BHYT</label>
          <Input
            {...register('insurance_number')}
            className={PORTAL_INPUT}
          />
          <label className={PORTAL_LABEL}>Dị ứng</label>
          <Input
            {...register('allergies')}
            className={PORTAL_INPUT}
          />

          {error && <ErrorAlert className="mt-4">{error}</ErrorAlert>}
          {saved && (
            <div className="mt-4 text-[13px] font-semibold text-[#0d9488]">
              Đã lưu thay đổi.
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="mt-5 h-auto w-full justify-center rounded-xl bg-[#0d9488] py-3 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
