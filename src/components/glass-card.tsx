import { cn } from "@/lib/utils"

type GlassVariant = "default" | "subtle" | "elevated"

export function GlassCard({
  variant = "default",
  className,
  children,
  ...props
}: {
  variant?: GlassVariant
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variant === "default" && "glass",
        variant === "subtle" && "glass-subtle",
        variant === "elevated" && "glass-elevated",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
