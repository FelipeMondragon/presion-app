"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Option = {
  value: string
  label: string
}

export function FloatingSelect({
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
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
        <SelectTrigger className="h-12 w-full rounded-xl border border-gray-200 bg-white/50 text-sm dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-400/20">
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
