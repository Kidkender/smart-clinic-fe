import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorAlert } from '@/components/ui/alert';
import type { VitalSignFormValues } from '@/schemas/consultation';

export const ORDER_TYPES = ['lab', 'imaging', 'xray', 'ct', 'mri', 'ultrasound', 'endoscopy'];
export const IMAGING_ORDER_TYPES = ['imaging', 'xray', 'ct', 'mri', 'ultrasound', 'endoscopy'];

export function includesRole(roles: string[], role: string | null): boolean {
  return role != null && roles.includes(role);
}

export function emptyVitalForm(): VitalSignFormValues {
  return { temperature: 0, pulse: 0, systolic: 0, diastolic: 0, respiratoryRate: 0, spo2: 0 };
}

export function SectionHeader({
  title,
  canAct,
  open,
  onToggle,
  actionLabel,
  extra,
}: {
  title: string;
  canAct: boolean;
  open: boolean;
  onToggle: () => void;
  actionLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-2">
      <h2 className="m-0 text-[17px] font-bold text-[#274760]">{title}</h2>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        {canAct && (
          <Button
            variant="outline"
            onClick={onToggle}
            className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-4 py-2.25 text-[13px] font-medium text-[#274760]"
          >
            <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:plus'} className="mr-1.5 text-xs" />
            {open ? 'Đóng' : actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SectionBadge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'danger' }) {
  const toneClass = tone === 'danger'
    ? 'bg-[#dc3545]/10 text-[#dc3545] hover:bg-[#dc3545]/10'
    : 'bg-[#307bc4]/10 text-[#307bc4] hover:bg-[#307bc4]/10';
  return (
    <Badge className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </Badge>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <ErrorAlert>{children}</ErrorAlert>;
}
