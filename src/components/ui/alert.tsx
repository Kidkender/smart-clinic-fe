import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

const alertVariants = cva("border border-[#dc3545]/30 bg-[#dc3545]/8 text-[#dc3545]", {
  variants: {
    variant: {
      default: "flex items-center gap-2.5 rounded-xl px-4.5 py-3.5",
      compact: "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px]",
      plain: "rounded-lg px-4 py-3 text-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface ErrorAlertProps extends VariantProps<typeof alertVariants> {
  message?: ReactNode
  children?: ReactNode
  className?: string
  icon?: boolean
}

function ErrorAlert({ message, children, className, icon, variant }: ErrorAlertProps) {
  const showIcon = icon ?? variant !== "plain"

  return (
    <div className={cn(alertVariants({ variant }), className)}>
      {showIcon && <Icon icon="fa6-solid:circle-exclamation" />}
      {message ?? children}
    </div>
  )
}

export { ErrorAlert, alertVariants }
