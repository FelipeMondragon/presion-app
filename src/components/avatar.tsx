import { cn } from "@/lib/utils"

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  const hex = (hash >>> 0).toString(16)
  return hex.padEnd(32, "0").slice(0, 32)
}

export function Avatar({
  email,
  name,
  size = "md",
  className,
}: {
  email?: string | null
  name?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizeMap = { sm: 8, md: 10, lg: 16 }
  const px = sizeMap[size]

  const gravatarUrl = email
    ? `https://www.gravatar.com/avatar/${simpleHash(email.trim().toLowerCase())}?d=identicon&s=${px * 4}`
    : null

  if (gravatarUrl) {
    return (
      <img
        src={gravatarUrl}
        alt={name || email || ""}
        className={cn(
          "shrink-0 rounded-full bg-gray-200 dark:bg-gray-700",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-16 w-16",
          className,
        )}
      />
    )
  }

  const initial = (name || email || "?").charAt(0).toUpperCase()
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-rose-500 text-xs font-bold text-white shadow-sm",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-16 w-16 text-lg",
        className,
      )}
    >
      {initial}
    </div>
  )
}
