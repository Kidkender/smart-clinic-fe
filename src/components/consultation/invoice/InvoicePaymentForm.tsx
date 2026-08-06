import type { FormEvent } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { paymentMethodLabel } from '@/utils/labels';
import { PAYMENT_METHODS, SELECTABLE_PAYMENT_METHODS } from './types';

interface InvoicePaymentFormProps {
  amount: string;
  /** Inpatient stays can take interim/deposit payments instead of only the
   * full remaining balance — see billing.go's enforceFull check. */
  amountEditable?: boolean;
  onAmountChange?: (value: string) => void;
  remaining?: number;
  method: (typeof PAYMENT_METHODS)[number];
  onMethodChange: (value: (typeof PAYMENT_METHODS)[number]) => void;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  changeDue: number | null;
  busy: boolean;
  paying: boolean;
  vnpayLoading: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
}

export default function InvoicePaymentForm({
  amount,
  amountEditable = false,
  onAmountChange,
  remaining,
  method,
  onMethodChange,
  cashReceived,
  onCashReceivedChange,
  changeDue,
  busy,
  paying,
  vnpayLoading,
  error,
  onSubmit,
}: InvoicePaymentFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2.5 rounded-2xl border border-[#e8edf2] p-4">
      <h3 className="m-0 text-sm font-bold text-[#274760]">Thanh toán</h3>
      {amountEditable && (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#274760]">
            Số tiền thu <span className="text-[#dc3545]">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="1000"
            max={remaining}
            value={amount}
            onChange={e => onAmountChange?.(e.target.value)}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
          <p className="m-0 mt-1 text-xs text-[#6c757d]">
            Còn lại {Math.max(remaining ?? 0, 0).toLocaleString('vi-VN')} đ — bệnh nhân nội trú có thể thu tạm ứng từng đợt, không bắt buộc thu đủ một lần.
          </p>
        </div>
      )}
      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Phương thức</label>
          <Select value={method} onValueChange={value => onMethodChange(value as (typeof PAYMENT_METHODS)[number])}>
            <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECTABLE_PAYMENT_METHODS.map(m => (
                <SelectItem key={m} value={m}>{paymentMethodLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={busy} size="cta" className="shrink-0">
          {method === 'vnpay'
            ? (vnpayLoading ? 'Đang chuyển hướng…' : 'Thanh toán qua VNPay')
            : (paying ? 'Đang ghi nhận…' : 'Ghi nhận')}
        </Button>
      </div>

      {method === 'cash' && (
        <div className="flex items-end gap-2.5">
          <div className="w-[160px]">
            <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Tiền khách đưa <span className="text-[#dc3545]">*</span></label>
            <Input
              type="number"
              min="0"
              step="1000"
              value={cashReceived}
              onChange={e => onCashReceivedChange(e.target.value)}
              placeholder="VD: 500000"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
          </div>
          {changeDue !== null && (
            <div className="flex-1 rounded-xl bg-[#f4f7fa] px-4 py-3 text-sm">
              <div className="flex items-center justify-between text-[#6c757d]">
                <span>Cần thu</span>
                <span>{Number(amount).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex items-center justify-between text-[#6c757d]">
                <span>Khách đưa</span>
                <span>{Number(cashReceived).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-[#dde2e8] pt-1 font-bold">
                {changeDue >= 0 ? (
                  <>
                    <span className="text-[#274760]">Tiền thừa</span>
                    <span className="text-[#274760]">{changeDue.toLocaleString('vi-VN')} đ</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#dc3545]">Còn thiếu</span>
                    <span className="text-[#dc3545]">{Math.abs(changeDue).toLocaleString('vi-VN')} đ</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <ErrorAlert icon={false}>{error}</ErrorAlert>}
    </form>
  );
}
