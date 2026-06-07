import * as React from "react"
import { cn } from "@/lib/utils"

const Toast = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg bg-card text-card-foreground">
        {children}
      </div>
    </div>
  )
}

export { Toast }
