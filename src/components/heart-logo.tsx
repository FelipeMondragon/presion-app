import { cn } from "@/lib/utils"

export function HeartLogo({
  size = "md",
  animated = false,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl"
  animated?: boolean
  className?: string
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-rose-500 shadow-lg shadow-red-500/25",
        sizes[size],
        animated && "animate-[heart-pulse_2s_ease-in-out_infinite]",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="white"
        className={cn(
          size === "sm" && "h-4 w-4",
          size === "md" && "h-6 w-6",
          size === "lg" && "h-8 w-8",
          size === "xl" && "h-10 w-10"
        )}
      >
        <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
      </svg>
    </div>
  )
}
