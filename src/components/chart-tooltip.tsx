import type { ReactNode } from "react"

export type ChartTooltipEntry = {
  value: number
  color: string
  name: string
}

type PayloadItem = {
  value?: number | null
  color?: string
  name?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

export function ChartTooltip({
  active,
  payload,
  render,
}: {
  active?: boolean
  payload?: PayloadItem[]
  render: (point: Record<string, unknown> | undefined, entries: ChartTooltipEntry[]) => ReactNode
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  const entries: ChartTooltipEntry[] = payload
    .map((p) => ({
      value: p.value ?? NaN,
      color: p.color ?? "#9ca3af",
      name: (p.name ?? p.dataKey ?? "") as string,
    }))
    .filter((e) => !Number.isNaN(e.value))
  return (
    <div className="min-w-[10rem] rounded-xl border border-gray-200/80 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/95">
      {render(point, entries)}
    </div>
  )
}
