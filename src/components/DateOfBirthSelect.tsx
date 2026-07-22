import { useEffect, useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year?: number, month?: number) {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const TRIGGER_CLASS = 'h-auto w-full rounded-xl border-[#dde2e8] px-3 py-3 text-[15px] text-[#274760]';

interface DateOfBirthSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function DateOfBirthSelect({ value, onChange, disabled, className }: DateOfBirthSelectProps) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [day, setDay] = useState<number | undefined>(undefined);

  useEffect(() => {
    const [y, m, d] = value ? value.split('-').map(Number) : [];
    setYear(y);
    setMonth(m);
    setDay(d);
  }, [value]);

  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  const commit = (nextDay?: number, nextMonth?: number, nextYear?: number) => {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(nextDay && nextMonth && nextYear ? `${nextYear}-${pad2(nextMonth)}-${pad2(nextDay)}` : '');
  };

  // Radix's Select fires a spurious onValueChange('') of its own when the
  // item-aligned SelectContent re-renders after a controlled value changes
  // (observed right after the sync effect above sets day/month/year from
  // props). That's not a real user selection, so empty/invalid values are
  // ignored here rather than treated as "clear the field".
  const handleDayChange = (v: string) => {
    if (!v) return;
    commit(Number(v), month, year);
  };

  const handleMonthChange = (v: string) => {
    if (!v) return;
    const nextMonth = Number(v);
    const maxDay = daysInMonth(year, nextMonth);
    commit(day && day > maxDay ? maxDay : day, nextMonth, year);
  };

  const handleYearChange = (v: string) => {
    if (!v) return;
    const nextYear = Number(v);
    const maxDay = daysInMonth(nextYear, month);
    commit(day && day > maxDay ? maxDay : day, month, nextYear);
  };

  return (
    <div className={className ?? 'grid grid-cols-3 gap-2'}>
      <Select value={day ? String(day) : ''} onValueChange={handleDayChange} disabled={disabled}>
        <SelectTrigger className={TRIGGER_CLASS}>
          <SelectValue placeholder="Ngày" />
        </SelectTrigger>
        <SelectContent position="popper">
          {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={month ? String(month) : ''} onValueChange={handleMonthChange} disabled={disabled}>
        <SelectTrigger className={TRIGGER_CLASS}>
          <SelectValue placeholder="Tháng" />
        </SelectTrigger>
        <SelectContent position="popper">
          {MONTHS.map(m => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={year ? String(year) : ''} onValueChange={handleYearChange} disabled={disabled}>
        <SelectTrigger className={TRIGGER_CLASS}>
          <SelectValue placeholder="Năm" />
        </SelectTrigger>
        <SelectContent position="popper">
          {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
