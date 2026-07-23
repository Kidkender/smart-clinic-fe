import { Icon } from '@iconify/react';
import { appointmentStatusLabel } from '@/utils/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Department, DoctorFilterOption } from './types';

export default function AppointmentFilters({
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  doctorFilter,
  onDoctorFilterChange,
  departments,
  doctorOptions,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  hasActiveFilters,
  onResetFilters,
}: {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  doctorFilter: string;
  onDoctorFilterChange: (value: string) => void;
  departments: Department[];
  doctorOptions: DoctorFilterOption[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[220px] flex-1">
        <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
        <Input
          value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          placeholder="Tìm theo tên, SĐT, CCCD, MRN…"
          className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-auto w-[170px] rounded-xl px-4 py-2.75 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="booked">{appointmentStatusLabel('booked')}</SelectItem>
          <SelectItem value="checked_in">{appointmentStatusLabel('checked_in')}</SelectItem>
          <SelectItem value="cancelled">{appointmentStatusLabel('cancelled')}</SelectItem>
          <SelectItem value="no_show">{appointmentStatusLabel('no_show')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
        <SelectTrigger className="h-auto w-[180px] rounded-xl px-4 py-2.75 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả khoa</SelectItem>
          {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={doctorFilter} onValueChange={onDoctorFilterChange}>
        <SelectTrigger className="h-auto w-[180px] rounded-xl px-4 py-2.75 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả bác sĩ</SelectItem>
          {doctorOptions.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Fullname}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex items-center rounded-xl border border-border bg-background py-2.75 pr-3.5 pl-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Từ ngày</span>
          <DatePicker
            value={dateFrom}
            onChange={onDateFromChange}
            className="h-auto w-[110px] justify-start gap-1.5 border-0 bg-transparent p-0 text-sm text-[#274760] shadow-none hover:bg-transparent"
          />
        </div>
        <div className="mx-3 h-4.5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium whitespace-nowrap text-[#6c757d]">Đến ngày</span>
          <DatePicker
            value={dateTo}
            onChange={onDateToChange}
            className="h-auto w-[110px] justify-start gap-1.5 border-0 bg-transparent p-0 text-sm text-[#274760] shadow-none hover:bg-transparent"
          />
        </div>
      </div>
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={onResetFilters}
          className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.75 text-sm font-medium text-[#6c757d] hover:text-[#dc3545]"
        >
          <Icon icon="fa6-solid:filter-circle-xmark" className="text-sm" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
