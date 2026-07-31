import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Encounter, Invoice } from './types';

interface InvoiceInsuranceSectionProps {
  invoice: Invoice;
  encounter: Encounter | null;
  showInsuranceForm: boolean;
  onShowInsuranceForm: () => void;
  onCancel: () => void;
  onSave: () => void;
  hasInsuranceInput: boolean;
  onHasInsuranceInputChange: (value: boolean) => void;
  coveragePercentInput: string;
  onCoveragePercentInputChange: (value: string) => void;
  registeredFacilityCodeInput: string;
  onRegisteredFacilityCodeInputChange: (value: string) => void;
  busy: boolean;
  savingInsurance: boolean;
}

export default function InvoiceInsuranceSection({
  invoice,
  encounter,
  showInsuranceForm,
  onShowInsuranceForm,
  onCancel,
  onSave,
  hasInsuranceInput,
  onHasInsuranceInputChange,
  coveragePercentInput,
  onCoveragePercentInputChange,
  registeredFacilityCodeInput,
  onRegisteredFacilityCodeInputChange,
  busy,
  savingInsurance,
}: InvoiceInsuranceSectionProps) {
  if (invoice.Status === 'cancelled') return null;

  return (
    <div className="rounded-2xl border border-[#e8edf2] p-3.5">
      {!showInsuranceForm ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#274760]">
              Thông tin BHYT
              {encounter?.HasInsurance && (
                encounter.CoveragePercent != null ? (
                  <span className="rounded-full bg-[#28a745]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#28a745]">Đã tính</span>
                ) : (
                  <span className="rounded-full bg-[#ffc107]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#a97a00]">Chưa tính</span>
                )
              )}
            </div>
            <div className="text-xs text-[#6c757d]">
              {encounter?.HasInsurance ? (
                <>
                  {encounter.CoveragePercent != null ? (
                    <>
                      Mức hưởng <span className="font-semibold text-[#274760]">{encounter.CoveragePercent}%</span> — chỉ áp dụng cho dịch vụ/thuốc trong danh mục BHYT, không phải toàn bộ hóa đơn
                    </>
                  ) : (
                    'Có BHYT · Chưa ghi nhận mức hưởng nên chưa ước tính được phần BHYT chi trả'
                  )}
                  {invoice.InNetwork != null && (
                    <>
                      {' · '}
                      <span className={invoice.InNetwork ? 'font-semibold text-[#28a745]' : 'font-semibold text-[#dc3545]'}>
                        {invoice.InNetwork ? 'Đúng tuyến' : 'Trái tuyến'}
                      </span>
                    </>
                  )}
                </>
              ) : (
                'Không sử dụng BHYT'
              )}
            </div>
          </div>
          {invoice.Status !== 'paid' && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onShowInsuranceForm}
              className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
            >
              Chi tiết
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="m-0 text-xs text-[#6c757d]">
            BHYT nên được ghi nhận ngay từ lúc check-in. Chỉ đính chính ở đây khi thông tin lúc check-in bị sai hoặc thiếu, trước khi thu tiền.
          </p>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#274760]">
            <input
              type="checkbox"
              checked={hasInsuranceInput}
              onChange={e => onHasInsuranceInputChange(e.target.checked)}
              className="size-4"
            />
            Có sử dụng BHYT
          </label>
          {hasInsuranceInput && (
            <div className="flex flex-wrap gap-2.5">
              <div className="w-[200px]">
                <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mức hưởng (%) — để trống nếu chưa biết</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={coveragePercentInput}
                  onChange={e => onCoveragePercentInputChange(e.target.value)}
                  placeholder="VD: 80"
                  className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                />
              </div>
              <div className="w-[200px]">
                <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mã cơ sở KCB ban đầu — để trống nếu chưa biết</label>
                <Input
                  value={registeredFacilityCodeInput}
                  onChange={e => onRegisteredFacilityCodeInputChange(e.target.value)}
                  placeholder="VD: 79001"
                  className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
              className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2 text-xs font-medium text-[#274760]"
            >
              Hủy
            </Button>
            <Button type="button" disabled={busy} onClick={onSave} size="cta-sm">
              {savingInsurance ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </div>
      )}
      {invoice.CoverageEstimate && (
        <div className="mt-3 rounded-xl bg-[#f4f7fa] px-3.5 py-2.5 text-xs text-[#6c757d]">
          <p className="m-0">Ước tính theo thông tin BHYT đã ghi nhận (chưa xác thực với BHXH).</p>
          {invoice.InNetwork === false && (
            <p className="m-0 mt-2 text-[#dc3545]">
              Trái tuyến — mức hưởng thực tế theo BHXH thường thấp hơn mức ghi trên thẻ. Vui lòng xác nhận lại mức hưởng với bệnh nhân trước khi thu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
