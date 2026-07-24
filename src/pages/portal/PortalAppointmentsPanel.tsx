import { Icon } from '@iconify/react';
import { appointmentStatusLabel } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { portalAppointmentStatusBadgeClass } from '@/utils/badgeStyles';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PORTAL_INPUT } from './constants';
import type { Appointment } from './types';

export default function PortalAppointmentsPanel({
  appointments,
  loading,
  onNewBooking,
  statusFilter,
  onStatusFilterChange,
  sortDir,
  onToggleSortDir,
  onCancel,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  appointments: Appointment[];
  loading: boolean;
  onNewBooking: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortDir: 'asc' | 'desc';
  onToggleSortDir: () => void;
  onCancel: (appt: Appointment) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <div className="my-4 flex items-center justify-between">
        <h2 className="m-0 text-lg font-bold text-[#134e48]">Lịch hẹn của tôi</h2>
        <Button
          onClick={onNewBooking}
          className="h-auto rounded-xl bg-[#0d9488] px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
        >
          <Icon icon="fa6-solid:plus" className="text-[13px]" /> Đặt lịch mới
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className={cn(PORTAL_INPUT, 'w-auto')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="booked">Đã đặt</SelectItem>
            <SelectItem value="checked_in">Đã check-in</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
            <SelectItem value="no_show">Không đến</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={onToggleSortDir}
          className="h-auto rounded-xl border-[#d1fae5] px-4 py-2.5 text-sm font-medium text-[#134e48]"
        >
          <Icon icon={sortDir === 'asc' ? 'fa6-solid:arrow-up-short-wide' : 'fa6-solid:arrow-down-wide-short'} className="text-xs" />
          Ngày hẹn
        </Button>
      </div>

      {loading ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
      ) : appointments.length === 0 ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Bạn chưa có lịch hẹn nào.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map(a => (
            <Card key={a.ID} className="rounded-2xl border-[#d1fae5] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-bold text-[#134e48]">{a.Department?.Name ?? `Khoa #${a.DepartmentID}`}</div>
                  <div className="mt-1 text-[13px] text-[#6c757d]">
                    {a.Doctor?.Fullname ? `BS. ${a.Doctor.Fullname} · ` : ''}{new Date(a.ScheduledAt).toLocaleString('vi-VN')}
                  </div>
                  {a.Reason && <div className="mt-1 text-[13px] text-[#6c757d]">Lý do: {a.Reason}</div>}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={cn('inline-block', portalAppointmentStatusBadgeClass(a.Status))}>
                    {appointmentStatusLabel(a.Status)}
                  </span>
                  {a.Status === 'booked' && (
                    <Button
                      variant="outline"
                      onClick={() => onCancel(a)}
                      className="h-auto rounded-xl border-[#dc3545]/20 px-3.5 py-1.75 text-[13px] font-semibold text-[#dc3545] hover:bg-[#dc3545]/10"
                    >
                      Hủy
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
          itemLabel="lịch hẹn"
          buttonClassName="border-[#d1fae5] text-[#134e48]"
        />
      )}
    </>
  );
}
