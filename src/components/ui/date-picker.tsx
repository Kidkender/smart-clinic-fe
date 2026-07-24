import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  min?: string
  max?: string
  /** 0 = Sunday ... 6 = Saturday, matching JS Date#getDay() */
  disabledDaysOfWeek?: number[]
  disabled?: boolean
  className?: string
}

function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  min,
  max,
  disabledDaysOfWeek,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseIsoDate(value)
  const minDate = parseIsoDate(min)
  const maxDate = parseIsoDate(max)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-slot="date-picker-trigger"
          className={cn(
            "h-auto w-full justify-start gap-2 rounded-xl border-input px-4 py-3 text-[15px] font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {selected ? selected.toLocaleDateString("vi-VN") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={date => {
            if (date) {
              onChange(toIsoDate(date))
              setOpen(false)
            }
          }}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
            ...(disabledDaysOfWeek && disabledDaysOfWeek.length > 0 ? [{ dayOfWeek: disabledDaysOfWeek }] : []),
          ]}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
