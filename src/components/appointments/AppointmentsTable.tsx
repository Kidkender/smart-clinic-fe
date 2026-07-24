import { Icon } from '@iconify/react';
import { appointmentStatusLabel } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { appointmentStatusBadgeClass } from '@/utils/badgeStyles';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Appointment } from './types';
import SortableTableHead from '@/components/ui/sortable-table-head';

export default function AppointmentsTable({
  appointments,
  loading,
  hasActiveFilters,
  canManage,
  sortBy,
  sortDir,
  onSort,
  onCheckIn,
  onNoShow,
  onCancel,
}: {
  appointments: Appointment[];
  loading: boolean;
  hasActiveFilters: boolean;
  canManage: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (column: string) => void;
  onCheckIn: (appt: Appointment) => void;
  onNoShow: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : appointments.length === 0 ? (
        <div className="p-15 text-center text-[#6c757d]">
          {hasActiveFilters ? 'Không tìm thấy lịch hẹn phù hợp.' : 'Chưa có lịch hẹn nào.'}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
              <SortableTableHead label="Bệnh nhân" column="patient" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTableHead label="Khoa" column="department" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTableHead label="Bác sĩ" column="doctor" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTableHead label="Thời gian" column="scheduled" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTableHead label="Trạng thái" column="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <TableHead className="h-auto px-4 py-3"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map(a => (
              <TableRow key={a.ID} className="border-t border-[#f0f4f8]">
                <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Patient?.Fullname ?? `#${a.PatientID}`}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Department?.Name ?? `#${a.DepartmentID}`}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Doctor?.Fullname ?? '—'}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#274760]">{new Date(a.ScheduledAt).toLocaleString('vi-VN')}</TableCell>
                <TableCell className="px-4 py-3 text-sm">
                  <span className={cn('inline-block', appointmentStatusBadgeClass(a.Status))}>
                    {appointmentStatusLabel(a.Status)}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {a.Status === 'booked' && canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => onCheckIn(a)}
                        title="Check-in"
                        className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#198754]"
                      >
                        <Icon icon="fa6-solid:right-to-bracket" className="text-[13px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNoShow(a)}
                        title="Không đến"
                        className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                      >
                        <Icon icon="fa6-solid:user-clock" className="text-[13px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancel(a)}
                        title="Hủy"
                        className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                      >
                        <Icon icon="fa6-solid:xmark" className="text-[13px]" />
                      </button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
