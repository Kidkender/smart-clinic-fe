import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  itemLabel: string
  className?: string
  buttonClassName?: string
}

function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  itemLabel,
  className,
  buttonClassName,
}: PaginationProps) {
  return (
    <div className={cn("mt-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="m-0 text-sm text-[#6c757d]">
        Trang {page}/{totalPages} · {total} {itemLabel}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className={cn("h-auto rounded-full border-[#dde2e8] px-4 py-2 text-sm font-medium text-[#274760]", buttonClassName)}
        >
          <Icon icon="fa6-solid:chevron-left" className="text-xs" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className={cn("h-auto rounded-full border-[#dde2e8] px-4 py-2 text-sm font-medium text-[#274760]", buttonClassName)}
        >
          Sau
          <Icon icon="fa6-solid:chevron-right" className="text-xs" />
        </Button>
      </div>
    </div>
  )
}

export { Pagination }
