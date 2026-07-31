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
import type { Appointment } from './types';

const CHECKIN_TYPES = [
  { value: 'new', label: 'Khám mới' },
  { value: 'follow_up', label: 'Tái khám' },
  { value: 'service', label: 'Dịch vụ' },
];

export default function CheckInDialog({
  target,
  checkInType,
  onCheckInTypeChange,
  hasInsurance,
  onHasInsuranceChange,
  coveragePercent,
  onCoveragePercentChange,
  registeredFacilityCode,
  onRegisteredFacilityCodeChange,
  syncToPatientProfile,
  onSyncToPatientProfileChange,
  checkingIn,
  onClose,
  onConfirm,
}: {
  target: Appointment | null;
  checkInType: string;
  onCheckInTypeChange: (value: string) => void;
  hasInsurance: boolean;
  onHasInsuranceChange: (value: boolean) => void;
  coveragePercent: string;
  onCoveragePercentChange: (value: string) => void;
  registeredFacilityCode: string;
  onRegisteredFacilityCodeChange: (value: string) => void;
  syncToPatientProfile: boolean;
  onSyncToPatientProfileChange: (value: boolean) => void;
  checkingIn: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={open => { if (!checkingIn && !open) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">Check-in bệnh nhân</DialogTitle>
        </DialogHeader>
        <div>
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

          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#274760] has-[:disabled]:opacity-50">
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
              <div className="w-[160px]">
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
              <div className="w-[160px]">
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
      </DialogContent>
    </Dialog>
  );
}
