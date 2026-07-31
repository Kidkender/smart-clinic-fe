import type { Control, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CheckInFormValues } from '@/schemas/queue';

interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
}

interface CheckInPrivateInsuranceFieldsProps {
  control: Control<CheckInFormValues>;
  register: UseFormRegister<CheckInFormValues>;
  hasPrivateInsurance: boolean;
  payers: Payer[];
}

export default function CheckInPrivateInsuranceFields({ control, register, hasPrivateInsurance, payers }: CheckInPrivateInsuranceFieldsProps) {
  const insurers = payers.filter(p => p.Type === 'insurance_company');

  return (
    <>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#274760]">
        <input type="checkbox" {...register('has_private_insurance')} className="size-4" />
        Có bảo hiểm tư nhân bảo lãnh
      </label>

      {hasPrivateInsurance && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#274760]">Công ty bảo hiểm *</label>
            <Controller
              control={control}
              name="private_payer_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]">
                    <SelectValue placeholder={insurers.length === 0 ? 'Chưa có công ty bảo hiểm nào — thêm ở trang Bên bảo lãnh viện phí' : 'Chọn công ty bảo hiểm'} />
                  </SelectTrigger>
                  <SelectContent>
                    {insurers.map(p => (
                      <SelectItem key={p.ID} value={String(p.ID)}>{p.Name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="w-[180px]">
              <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Số hợp đồng/thẻ *</label>
              <Input
                {...register('private_policy_number')}
                placeholder="VD: HD-2026-00123"
                className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
              />
            </div>
            <div className="w-[180px]">
              <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Số thẻ (nếu có)</label>
              <Input
                {...register('private_card_number')}
                placeholder="VD: 0012345"
                className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="w-[180px]">
              <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Hiệu lực từ</label>
              <Controller
                control={control}
                name="private_valid_from"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]" />
                )}
              />
            </div>
            <div className="w-[180px]">
              <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Hiệu lực đến</label>
              <Controller
                control={control}
                name="private_valid_to"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]" />
                )}
              />
            </div>
          </div>

          <div className="w-[180px]">
            <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mức chi trả ước tính (%) — nếu biết</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              {...register('private_coverage_percent_estimate')}
              placeholder="VD: 80"
              className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
            />
          </div>

          <p className="m-0 text-xs text-[#6c757d]">
            Hệ thống tự kiểm tra hợp đồng còn hiệu lực (theo ngày hết hạn) — nếu đã hết hạn, lượt khám sẽ được đánh dấu không đủ điều kiện và cần xác nhận lại. Số tiền bảo hiểm chi trả cụ thể sẽ được chốt khi lập hóa đơn.
          </p>
        </div>
      )}
    </>
  );
}
