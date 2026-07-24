import { Button } from '@/components/ui/button';
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
  { value: 'insurance', label: 'BHYT' },
  { value: 'service', label: 'Dịch vụ' },
];

export default function CheckInDialog({
  target,
  checkInType,
  onCheckInTypeChange,
  checkingIn,
  onClose,
  onConfirm,
}: {
  target: Appointment | null;
  checkInType: string;
  onCheckInTypeChange: (value: string) => void;
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
