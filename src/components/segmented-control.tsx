"use client"

import { cn } from "@/lib/utils"

type Option = {
  value: string
  label: string
}

export function SegmentedControl({
  value,
  onValueChange,
  label,
  options,
}: {
  value: string
  onValueChange: (value: string) => void
  label: string
  options: Option[]
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100/50 p-1 dark:border-gray-600 dark:bg-gray-800/50">
        {options.map((opt) => {
          const isSelected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onValueChange(opt.value)}
              className={cn(
                "flex-1 rounded-[8px] px-2 py-1.5 text-center text-sm font-medium transition-all duration-200",
                isSelected
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
