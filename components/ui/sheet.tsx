import * as React from "react"
import { cn } from "@/lib/utils"

const Sheet = ({ children }: { children: React.ReactNode }) => <div>{children}</div>

const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 h-full w-3/4 border-l bg-background p-6 shadow-lg transition ease-in-out duration-300 sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
SheetContent.displayName = "SheetContent"

export { Sheet, SheetContent }
