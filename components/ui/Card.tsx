import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // WANDER Style: 白色背景，极细的 zinc-200 边框，轻微阴影
      "rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm transition-all hover:border-zinc-300",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

export { Card }