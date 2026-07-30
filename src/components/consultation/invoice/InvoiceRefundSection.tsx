import type { FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Invoice } from './types';

interface InvoiceRefundSectionProps {
  invoice: Invoice;
  canRefund: boolean;
  showRefundForm: boolean;
  onShowRefundForm: () => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  refundItemId: string;
  onRefundItemIdChange: (value: string) => void;
  refundAmount: string;
  onRefundAmountChange: (value: string) => void;
  refundReason: string;
  onRefundReasonChange: (value: string) => void;
  busy: boolean;
  refunding: boolean;
}

export default function InvoiceRefundSection({
  invoice,
  canRefund,
  showRefundForm,
  onShowRefundForm,
  onCancel,
  onSubmit,
  refundItemId,
  onRefundItemIdChange,
  refundAmount,
  onRefundAmountChange,
  refundReason,
  onRefundReasonChange,
  busy,
  refunding,
}: InvoiceRefundSectionProps) {
  if (!canRefund) return null;

  if (!showRefundForm) {
    return (
      <div className="mt-4 border-t border-[#e8edf2] pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onShowRefundForm}
          className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.5 text-sm font-semibold text-[#dc3545]"
        >
          <Icon icon="fa6-solid:rotate-left" className="mr-1.5 text-xs" />Hoàn tiền
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-2.5 border-t border-[#e8edf2] pt-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Áp dụng cho</label>
        <Select value={refundItemId} onValueChange={onRefundItemIdChange}>
          <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="whole_invoice">Toàn hóa đơn (không gắn dòng cụ thể)</SelectItem>
            {(invoice.Items ?? []).map(item => (
              <SelectItem key={item.ID} value={String(item.ID)}>{item.Description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2.5">
        <div className="w-[160px]">
          <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tiền hoàn</label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={refundAmount}
            onChange={e => onRefundAmountChange(e.target.value)}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Lý do</label>
          <Input
            value={refundReason}
            onChange={e => onRefundReasonChange(e.target.value)}
            placeholder="VD: Hủy dịch vụ, trả thuốc dư"
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
          className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.5 text-sm font-medium text-[#274760]"
        >
          Hủy
        </Button>
        <Button type="submit" disabled={busy} size="cta">
          {refunding ? 'Đang hoàn…' : 'Xác nhận hoàn tiền'}
        </Button>
      </div>
    </form>
  );
}
