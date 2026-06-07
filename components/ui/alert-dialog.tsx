import * as React from "react"
import { cn } from "@/lib/utils"

const AlertDialog = ({ children }: { children: React.ReactNode }) => <div>{children}</div>

const AlertDialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
AlertDialogContent.displayName = "AlertDialogContent"

export { AlertDialog, AlertDialogContent }
