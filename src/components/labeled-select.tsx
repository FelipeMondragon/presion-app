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

export function LabeledSelect({
  value,
  onValueChange,
  label,
  options,
  placeholder,
}: {
  value: string
  onValueChange: (value: string) => void
  label: string
  options: Option[]
  placeholder?: string
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder || value

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
        <SelectTrigger className="glass-subtle">
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
