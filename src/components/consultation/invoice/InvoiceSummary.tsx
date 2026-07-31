import { invoiceItemCategoryLabel, paymentMethodLabel } from '@/utils/labels';
import type { Invoice } from './types';

interface InvoiceSummaryProps {
  invoice: Invoice;
  patientPaidTotal: number;
  refundedTotal: number;
  payableTotal: number;
  remaining: number;
}

export default function InvoiceSummary({ invoice, patientPaidTotal, refundedTotal, payableTotal, remaining }: InvoiceSummaryProps) {
  const coverage = invoice.CoverageEstimate;
  const items = invoice.Items ?? [];
  const coveredItemCount = items.filter(i => i.CoveredByInsurance).length;

  return (
    <>
      <div className="mt-4 flex flex-col gap-2">
        {(invoice.Items ?? []).map(item => (
          <div key={item.ID} className="flex items-center justify-between gap-2 rounded-xl border border-[#e8edf2] px-3.5 py-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#274760]">
                {item.Description}
                {item.CoveredByInsurance && (
                  <span className="rounded-full bg-[#28a745]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#28a745]">BHYT</span>
                )}
              </div>
              <div className="text-xs text-[#6c757d]">
                {invoiceItemCategoryLabel(item.Category)} · {item.Quantity} x {item.UnitPrice.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#274760]">
              {item.Amount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-[#e8edf2] pt-3.5">
        {invoice.TaxAmount > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-[#6c757d]">
              <span>Tạm tính</span>
              <span>{invoice.SubtotalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#6c757d]">
              <span>Thuế VAT</span>
              <span>{invoice.TaxAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#274760]">Tổng viện phí</span>
          <span className="text-lg font-bold text-[#274760]">{invoice.TotalAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        {coverage && (
          <>
            <div className="flex items-center justify-between text-sm text-[#28a745]">
              <span>BHYT tạm chi (ước tính)</span>
              <span>-{coverage.covered_amount.toLocaleString('vi-VN')} đ</span>
            </div>
            {coverage.eligible_amount === 0 ? (
              <p className="m-0 text-xs italic text-[#6c757d]">
                Không có dòng dịch vụ/thuốc nào trong danh mục BHYT trên hóa đơn này nên BHYT chưa chi trả gì.
              </p>
            ) : (
              <p className="m-0 text-xs italic text-[#6c757d]">
                BHYT áp dụng cho {coveredItemCount}/{items.length} dòng — số tiền chốt cuối theo bảng Phân bổ chi trả bên dưới.
              </p>
            )}
            <div className="flex items-center justify-between text-sm font-semibold text-[#274760]">
              <span>Bệnh nhân phải trả (ước tính)</span>
              <span>{payableTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          </>
        )}
        {patientPaidTotal > 0 && (
          <div className="flex items-center justify-between text-sm text-[#28a745]">
            <span>Đã thu từ bệnh nhân</span>
            <span>{patientPaidTotal.toLocaleString('vi-VN')} đ</span>
          </div>
        )}
        {refundedTotal > 0 && (
          <div className="flex items-center justify-between text-sm text-[#dc3545]">
            <span>Đã hoàn</span>
            <span>-{refundedTotal.toLocaleString('vi-VN')} đ</span>
          </div>
        )}
        {remaining > 0 && invoice.Status !== 'cancelled' && invoice.Status !== 'paid' && (
          <div className="flex items-center justify-between text-sm font-semibold text-[#274760]">
            <span>Còn phải thu từ bệnh nhân</span>
            <span>{remaining.toLocaleString('vi-VN')} đ</span>
          </div>
        )}
      </div>

      {(invoice.Payments?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-[#e8edf2] pt-3.5">
          <h3 className="mb-2 text-sm font-bold text-[#274760]">Lịch sử thanh toán</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {invoice.Payments!.map(p => (
              <li key={p.ID} className="flex items-center justify-between text-xs text-[#6c757d]">
                <span>{paymentMethodLabel(p.Method)} · {new Date(p.PaidAt).toLocaleString('vi-VN')}</span>
                <span className="font-semibold text-[#274760]">{p.Amount.toLocaleString('vi-VN')} đ</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(invoice.Refunds?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-[#e8edf2] pt-3.5">
          <h3 className="mb-2 text-sm font-bold text-[#274760]">Lịch sử hoàn tiền</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {invoice.Refunds!.map(r => (
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
        </div>
      )}
    </>
  );
}
