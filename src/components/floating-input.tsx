"use client"

import { cn } from "@/lib/utils"

export function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  error,
  size = "sm",
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  error?: string
  size?: "sm" | "lg"
}) {
  const isLg = size === "lg"

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        required={required}
        autoComplete={autoComplete}
        className={cn(
          "peer w-full rounded-xl border bg-white/50 px-4 transition-all placeholder-transparent focus:outline-none",
          "dark:bg-gray-900/50 dark:text-gray-100",
          isLg ? "h-16 pt-5 text-2xl font-mono" : "h-12 pt-3 text-sm",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-gray-600 dark:focus:border-red-500"
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 text-sm transition-all",
          isLg
            ? "top-3.5 peer-placeholder-shown:top-5 peer-placeholder-shown:text-lg peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-red-500"
            : "top-3 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-red-500",
          value && (isLg ? "top-1.5 text-xs" : "top-1.5 text-xs") + " text-gray-500 dark:text-gray-400",
          error && "text-red-500"
        )}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
