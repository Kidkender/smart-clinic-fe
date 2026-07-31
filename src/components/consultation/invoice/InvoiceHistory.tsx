import { Icon } from '@iconify/react';
import { paymentMethodLabel } from '@/utils/labels';
import type { Invoice } from './types';

interface InvoiceHistoryProps {
  invoice: Invoice;
}

export default function InvoiceHistory({ invoice }: InvoiceHistoryProps) {
  const payments = invoice.Payments ?? [];
  const refunds = invoice.Refunds ?? [];
  const count = payments.length + refunds.length;
  if (count === 0) return null;

  return (
    <details className="group overflow-hidden rounded-2xl border border-[#e8edf2]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold text-[#274760] marker:content-['']">
        Lịch sử thanh toán &amp; hoàn tiền ({count})
        <Icon icon="fa6-solid:chevron-down" className="text-xs text-[#6c757d] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#e8edf2] px-4 py-3">
        {payments.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {payments.map(p => (
              <li key={p.ID} className="flex items-center justify-between text-xs text-[#6c757d]">
                <span>{paymentMethodLabel(p.Method)} · {new Date(p.PaidAt).toLocaleString('vi-VN')}</span>
                <span className="font-semibold text-[#274760]">{p.Amount.toLocaleString('vi-VN')} đ</span>
              </li>
            ))}
          </ul>
        )}
        {refunds.length > 0 && (
          <ul className={`m-0 flex list-none flex-col gap-1.5 p-0 ${payments.length > 0 ? 'mt-2.5 border-t border-[#f0f4f8] pt-2.5' : ''}`}>
            {refunds.map(r => (
              <li key={r.ID} className="flex items-center justify-between text-xs text-[#6c757d]">
                <span>
                  {r.Reason}
                  {r.InvoiceItem && <> · <span className="italic">{r.InvoiceItem.Description}</span></>}
                  {' '}· {new Date(r.RefundedAt).toLocaleString('vi-VN')}
                </span>
                <span className="font-semibold text-[#dc3545]">-{r.Amount.toLocaleString('vi-VN')} đ</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
