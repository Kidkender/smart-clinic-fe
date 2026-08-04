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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CheckInPrivateInsuranceFields from '@/components/queue/CheckInPrivateInsuranceFields';
import type { Appointment } from './types';

interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
}

interface Room {
  ID: number | string;
  Name: string;
  Type: string;
  Status: string;
}

const CHECKIN_TYPES = [
  { value: 'new', label: 'Khám mới' },
  { value: 'follow_up', label: 'Tái khám' },
  { value: 'service', label: 'Dịch vụ' },
];

export default function CheckInDialog({
  target,
  error,
  checkInType,
  onCheckInTypeChange,
  roomId,
  onRoomIdChange,
  rooms,
  hasInsurance,
  onHasInsuranceChange,
  coveragePercent,
  onCoveragePercentChange,
  registeredFacilityCode,
  onRegisteredFacilityCodeChange,
  syncToPatientProfile,
  onSyncToPatientProfileChange,
  hasPrivateInsurance,
  onHasPrivateInsuranceChange,
  privatePayerId,
  onPrivatePayerIdChange,
  privatePolicyNumber,
  onPrivatePolicyNumberChange,
  privateCardNumber,
  onPrivateCardNumberChange,
  privateValidFrom,
  onPrivateValidFromChange,
  privateValidTo,
  onPrivateValidToChange,
  privateCoveragePercentEstimate,
  onPrivateCoveragePercentEstimateChange,
  payers,
  checkingIn,
  onClose,
  onConfirm,
}: {
  target: Appointment | null;
  error: string;
  checkInType: string;
  onCheckInTypeChange: (value: string) => void;
  roomId: string;
  onRoomIdChange: (value: string) => void;
  rooms: Room[];
  hasInsurance: boolean;
  onHasInsuranceChange: (value: boolean) => void;
  coveragePercent: string;
  onCoveragePercentChange: (value: string) => void;
  registeredFacilityCode: string;
  onRegisteredFacilityCodeChange: (value: string) => void;
  syncToPatientProfile: boolean;
  onSyncToPatientProfileChange: (value: boolean) => void;
  hasPrivateInsurance: boolean;
  onHasPrivateInsuranceChange: (value: boolean) => void;
  privatePayerId: string;
  onPrivatePayerIdChange: (value: string) => void;
  privatePolicyNumber: string;
  onPrivatePolicyNumberChange: (value: string) => void;
  privateCardNumber: string;
  onPrivateCardNumberChange: (value: string) => void;
  privateValidFrom: string;
  onPrivateValidFromChange: (value: string) => void;
  privateValidTo: string;
  onPrivateValidToChange: (value: string) => void;
  privateCoveragePercentEstimate: string;
  onPrivateCoveragePercentEstimateChange: (value: string) => void;
  payers: Payer[];
  checkingIn: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={open => { if (!checkingIn && !open) onClose(); }}>
      {/* Only the body scrolls (flex-1 + min-h-0 + overflow-y-auto below) — the
          header stays outside that scrolling box entirely, so the scrollbar
          that appears once "Thêm chi tiết" expands the form never sits flush
          against the dialog's rounded corner and doesn't cut it off. Padding
          lives on the header/body themselves, not on DialogContent. */}
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-[720px] rounded-[20px] p-0">
      <div className="flex max-h-[90vh] flex-col">
        <DialogHeader className="shrink-0 pl-8">
          <DialogTitle className="text-xl font-bold text-[#274760]">Check-in bệnh nhân</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
          <p className="m-0 text-sm text-[#6c757d]">
            {target?.Patient?.Fullname ?? `#${target?.PatientID}`}
          </p>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại khám *</label>
          <Select value={checkInType} onValueChange={onCheckInTypeChange}>
            <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKIN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Phòng khám (không bắt buộc)</label>
          <Select value={roomId || 'none'} onValueChange={v => onRoomIdChange(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
              <SelectValue placeholder="Chưa chỉ định phòng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Chưa chỉ định phòng</SelectItem>
              {rooms.filter(r => r.Type === 'consultation' && r.Status === 'active').map(r => (
                <SelectItem key={r.ID} value={String(r.ID)}>{r.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <p className="m-0 mb-2 text-[11px] font-bold tracking-wide text-[#6c757d] uppercase">BHYT</p>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#274760] has-[:disabled]:opacity-50">
                <input
                  type="checkbox"
                  checked={hasInsurance && checkInType !== 'service'}
                  disabled={checkInType === 'service'}
                  onChange={e => onHasInsuranceChange(e.target.checked)}
                  className="size-4"
                />
                Có sử dụng BHYT
              </label>
              {checkInType === 'service' && (
                <p className="m-0 mt-1 text-xs text-[#6c757d]">Khám dịch vụ không áp dụng BHYT.</p>
              )}
              {hasInsurance && checkInType !== 'service' && (
                <div className="mt-2.5 flex flex-wrap gap-2.5">
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mức hưởng (%) — để trống nếu chưa biết</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={coveragePercent}
                      onChange={e => onCoveragePercentChange(e.target.value)}
                      placeholder="VD: 80"
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mã cơ sở KCB ban đầu</label>
                    <Input
                      value={registeredFacilityCode}
                      onChange={e => onRegisteredFacilityCodeChange(e.target.value)}
                      placeholder="VD: 79001"
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                    />
                  </div>
                </div>
              )}
              {hasInsurance && checkInType !== 'service' && (
                <label className="mt-2.5 flex items-center gap-2 text-xs text-[#6c757d]">
                  <input
                    type="checkbox"
                    checked={syncToPatientProfile}
                    onChange={e => onSyncToPatientProfileChange(e.target.checked)}
                    className="size-3.5"
                  />
                  Cập nhật vào hồ sơ bệnh nhân
                </label>
              )}
            </div>

            <div className="sm:border-l sm:border-[#e8edf2] sm:pl-6">
              <CheckInPrivateInsuranceFields
                hasPrivateInsurance={hasPrivateInsurance}
                onHasPrivateInsuranceChange={onHasPrivateInsuranceChange}
                payerId={privatePayerId}
                onPayerIdChange={onPrivatePayerIdChange}
                policyNumber={privatePolicyNumber}
                onPolicyNumberChange={onPrivatePolicyNumberChange}
                cardNumber={privateCardNumber}
                onCardNumberChange={onPrivateCardNumberChange}
                validFrom={privateValidFrom}
                onValidFromChange={onPrivateValidFromChange}
                validTo={privateValidTo}
                onValidToChange={onPrivateValidToChange}
                coveragePercentEstimate={privateCoveragePercentEstimate}
                onCoveragePercentEstimateChange={onPrivateCoveragePercentEstimateChange}
                payers={payers}
              />
            </div>
          </div>

          {error && <ErrorAlert className="mt-4">{error}</ErrorAlert>}

          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={checkingIn}
              className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={checkingIn}
              size="cta"
            >
              {checkingIn ? 'Đang check-in…' : 'Check-in'}
            </Button>
          </DialogFooter>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
