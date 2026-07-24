import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Tất cả",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find(o => o.value === selected[0])?.label ?? placeholder)
        : `${selected.length} đã chọn`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-slot="multi-select-trigger"
          className={cn(
            "h-auto w-full justify-between gap-2 rounded-xl border-input px-4 py-3 text-[15px] font-normal",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[180px] p-1.5" align="start">
        {options.map(opt => {
          const checked = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[15px] text-foreground select-none hover:bg-accent hover:text-accent-foreground"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border border-input",
                  checked && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {checked && <CheckIcon className="size-3" />}
              </span>
              {opt.label}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect }
export type { MultiSelectOption }
