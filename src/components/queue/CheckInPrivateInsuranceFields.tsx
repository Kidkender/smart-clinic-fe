import { useState } from 'react';
import { Icon } from '@iconify/react';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
}

interface CheckInPrivateInsuranceFieldsProps {
  hasPrivateInsurance: boolean;
  onHasPrivateInsuranceChange: (value: boolean) => void;
  payerId: string;
  onPayerIdChange: (value: string) => void;
  policyNumber: string;
  onPolicyNumberChange: (value: string) => void;
  cardNumber: string;
  onCardNumberChange: (value: string) => void;
  validFrom: string;
  onValidFromChange: (value: string) => void;
  validTo: string;
  onValidToChange: (value: string) => void;
  coveragePercentEstimate: string;
  onCoveragePercentEstimateChange: (value: string) => void;
  payers: Payer[];
}

export default function CheckInPrivateInsuranceFields({
  hasPrivateInsurance,
  onHasPrivateInsuranceChange,
  payerId,
  onPayerIdChange,
  policyNumber,
  onPolicyNumberChange,
  cardNumber,
  onCardNumberChange,
  validFrom,
  onValidFromChange,
  validTo,
  onValidToChange,
  coveragePercentEstimate,
  onCoveragePercentEstimateChange,
  payers,
}: CheckInPrivateInsuranceFieldsProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const insurers = payers.filter(p => p.Type === 'insurance_company');

  return (
    <div>
      <p className="m-0 mb-2 text-[11px] font-bold tracking-wide text-[#6c757d] uppercase">Bảo hiểm tư nhân</p>

      <label className="flex items-center gap-2 text-sm font-semibold text-[#274760]">
        <input
          type="checkbox"
          checked={hasPrivateInsurance}
          onChange={e => onHasPrivateInsuranceChange(e.target.checked)}
          className="size-4"
        />
        Có bảo hiểm tư nhân bảo lãnh
      </label>

      {hasPrivateInsurance && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#274760]">Công ty bảo hiểm *</label>
            <Select value={payerId} onValueChange={onPayerIdChange}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]">
                <SelectValue placeholder={insurers.length === 0 ? 'Chưa có công ty bảo hiểm nào — thêm ở trang Bên bảo lãnh viện phí' : 'Chọn công ty bảo hiểm'} />
              </SelectTrigger>
              <SelectContent>
                {insurers.map(p => (
                  <SelectItem key={p.ID} value={String(p.ID)}>{p.Name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#274760]">Số hợp đồng/thẻ *</label>
            <Input
              value={policyNumber}
              onChange={e => onPolicyNumberChange(e.target.value)}
              placeholder="VD: HD-2026-00123"
              className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMoreDetails(v => !v)}
            className="flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent p-0 text-xs font-semibold text-[#307bc4]"
          >
            <Icon icon={showMoreDetails ? 'fa6-solid:chevron-up' : 'fa6-solid:chevron-down'} className="text-[10px]" />
            {showMoreDetails ? 'Ẩn chi tiết' : 'Thêm chi tiết (số thẻ, hiệu lực, mức chi trả)'}
          </button>

          {showMoreDetails && (
            <div className="flex flex-col gap-2.5 border-l-2 border-[#f0f4f8] pl-3">
              <div>
                <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Số thẻ (nếu có)</label>
                <Input
                  value={cardNumber}
                  onChange={e => onCardNumberChange(e.target.value)}
                  placeholder="VD: 0012345"
                  className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
                <div className="min-w-[140px] flex-1">
                  <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Hiệu lực từ</label>
                  <DatePicker value={validFrom} onChange={onValidFromChange} className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]" />
                </div>
                <div className="min-w-[140px] flex-1">
                  <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Hiệu lực đến</label>
                  <DatePicker value={validTo} onChange={onValidToChange} className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]" />
                </div>
              </div>

              <div className="max-w-[220px]">
                <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mức chi trả ước tính (%) — nếu biết</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={coveragePercentEstimate}
                  onChange={e => onCoveragePercentEstimateChange(e.target.value)}
                  placeholder="VD: 80"
                  className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                />
              </div>
            </div>
          )}

          <p className="m-0 text-xs text-[#6c757d]">
            Hệ thống tự kiểm tra hợp đồng còn hiệu lực (theo ngày hết hạn) — nếu đã hết hạn, lượt khám sẽ được đánh dấu không đủ điều kiện và cần xác nhận lại. Số tiền bảo hiểm chi trả cụ thể sẽ được chốt khi lập hóa đơn.
          </p>
        </div>
      )}
    </div>
  );
}
