import { invoiceItemCategoryLabel } from '@/utils/labels';
import type { Invoice, InvoiceItem } from './types';

interface InvoiceSummaryProps {
  invoice: Invoice;
  patientPaidTotal: number;
  refundedTotal: number;
  payableTotal: number;
  remaining: number;
}

const CATEGORY_ORDER = ['visit_fee', 'service_fee', 'drug_fee', 'bed_fee', 'supply_fee'] as const;

const groupItemsByCategory = (items: InvoiceItem[]) => {
  const groups = new Map<string, InvoiceItem[]>();
  for (const item of items) {
    const key = item.Category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a as typeof CATEGORY_ORDER[number]);
    const bi = CATEGORY_ORDER.indexOf(b as typeof CATEGORY_ORDER[number]);
    return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
  });
};

export default function InvoiceSummary({ invoice, patientPaidTotal, refundedTotal, payableTotal, remaining }: InvoiceSummaryProps) {
  const coverage = invoice.CoverageEstimate;
  const items = invoice.Items ?? [];
  const coveredItemCount = items.filter(i => i.CoveredByInsurance).length;
  // CoverageEstimate is a live re-estimate from encounter.HasInsurance/CoveragePercent
  // and can be null even when BHYT has already been deducted via an actual
  // government allocation (e.g. entered through the manual split flow) — the
  // allocation row is the source of truth for whether/how much BHYT paid.
  const bhytAllocation = (invoice.Allocations ?? []).find(a => a.Payer?.Type === 'government');
  const bhytAmount = bhytAllocation?.AllocatedAmount ?? coverage?.covered_amount ?? 0;
  // Private insurers (Bảo Việt, PVI, ...) show up as their own allocation
  // rows — distinct from BHYT (government) and the patient's own row
  // (PayerID null). Both deductions must be visible here, not just in the
  // allocation table below, or the jump from "Tổng viện phí" to "Bệnh nhân
  // phải trả" looks unexplained.
  const insuranceCompanyAllocations = (invoice.Allocations ?? []).filter(a => a.Payer?.Type === 'insurance_company');
  const insuranceCompanyAmount = insuranceCompanyAllocations.reduce((sum, a) => sum + a.AllocatedAmount, 0);
  const showDeductions = bhytAmount > 0 || insuranceCompanyAmount > 0;
  // A BHYT/insurer row can exist while the patient's own remainder is still
  // unresolved (see InvoiceAllocationsSection's hasPatientAllocation) — in
  // that state payableTotal is 0 not because the patient truly owes nothing,
  // but because no patient allocation row has been created yet. Showing a
  // bare "0 đ" here reads as "fully covered," so it needs its own caveat
  // distinct from the CoverageEstimate "(ước tính)" case above.
  const hasPatientAllocation = (invoice.Allocations ?? []).some(a => a.PayerID === null);
  const patientShareUnresolved = showDeductions && !hasPatientAllocation;
  const showRemaining = remaining > 0 && invoice.Status !== 'cancelled' && invoice.Status !== 'paid';

  return (
    <>
      <p className="m-0 mb-2.5 text-[11px] font-bold tracking-wide text-[#6c757d] uppercase">Dịch vụ &amp; thuốc đã dùng</p>
      <div className="flex flex-col gap-2.5">
        {groupItemsByCategory(items).map(([category, groupItems]) => (
          <div key={category} className="overflow-hidden rounded-2xl border border-[#e8edf2]">
            <div className="flex items-center justify-between gap-2 bg-[#f4f7fa] px-3.5 py-2 text-[11px] font-bold tracking-wide text-[#6c757d] uppercase">
              <span>{invoiceItemCategoryLabel(category)}</span>
              <span>{groupItems.reduce((sum, item) => sum + item.Amount, 0).toLocaleString('vi-VN')} đ</span>
            </div>
            {groupItems.map(item => (
              <div key={item.ID} className="flex items-center justify-between gap-2 border-t border-[#e8edf2] px-3.5 py-2.5">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#274760]">
                    {item.Description}
                    {item.CoveredByInsurance && (
                      <span className="rounded-full bg-[#28a745]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#28a745]">BHYT</span>
                    )}
                  </div>
                  <div className="text-xs text-[#6c757d]">
                    {item.Quantity} x {item.UnitPrice.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#274760]">
                  {item.Amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="m-0 mt-4 mb-2.5 text-[11px] font-bold tracking-wide text-[#6c757d] uppercase">Tổng kết</p>
      <div className="flex flex-col gap-2 rounded-2xl border border-[#e8edf2] bg-[#f4f7fa] px-4 py-3.5">
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
        <div className="flex items-center justify-between text-sm font-bold text-[#274760]">
          <span>Tổng viện phí</span>
          <span>{invoice.TotalAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        {showDeductions && (
          <>
            {bhytAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-[#28a745]">
                <span>BHYT đã trừ{bhytAllocation ? '' : ' (ước tính)'}</span>
                <span>-{bhytAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            {coverage && (
              coverage.eligible_amount === 0 ? (
                <p className="m-0 text-xs italic text-[#6c757d]">
                  Không có dòng dịch vụ/thuốc nào trong danh mục BHYT trên hóa đơn này nên BHYT chưa chi trả gì.
                </p>
              ) : (
                <p className="m-0 text-xs italic text-[#6c757d]">
                  BHYT áp dụng cho {coveredItemCount}/{items.length} dòng — số tiền chốt cuối theo bảng Phân bổ chi trả bên dưới.
                </p>
              )
            )}
            {insuranceCompanyAllocations.map(a => (
              <div key={a.ID} className="flex items-center justify-between text-sm text-[#307bc4]">
                <span>{a.Payer?.Name ?? 'Bảo hiểm bảo lãnh'} đã trừ</span>
                <span>-{a.AllocatedAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm font-semibold text-[#274760]">
              <span>Bệnh nhân phải trả{coverage && !bhytAllocation ? ' (ước tính)' : ''}{patientShareUnresolved ? ' (chưa chốt)' : ''}</span>
              <span>{payableTotal.toLocaleString('vi-VN')} đ</span>
            </div>
            {patientShareUnresolved && (
              <p className="m-0 text-xs italic text-[#dc3545]">
                Chưa bấm "Phân bổ thanh toán" nên số tiền bệnh nhân phải trả chưa được tính — xem mục Phân bổ chi trả bên dưới.
              </p>
            )}
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
        {showRemaining && (
          <>
            <div className="border-t border-dashed border-[#dde2e8]" />
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-extrabold text-[#274760]">Còn phải thu từ bệnh nhân</span>
              <span className="text-[15px] font-extrabold text-[#dc3545]">{remaining.toLocaleString('vi-VN')} đ</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
