export type TrendReading = {
  measured_at: string
  systolic: number
  diastolic: number
  pulse?: number | null
}

export type TrendStats = {
  count: number
  daysWithData: number
  avgSys: number | null
  avgDia: number | null
  avgPulse: number | null
  stdDevSys: number | null
  stdDevDia: number | null
  crisisCount: number
}

export type TrendDiff = {
  avgSys: number | null
  avgDia: number | null
}

export type TrendDailyPoint = {
  date: Date
  count: number
  sys: number | null
  dia: number | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function rawMean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

function mean(values: number[]): number | null {
  const m = rawMean(values)
  return m == null ? null : Math.round(m)
}

function stdev(values: number[]): number | null {
  // ponytail: population stdev, add sample vs population choice if ever shown to clinicians
  if (values.length < 2) return null
  const m = rawMean(values)!
  return Math.round(Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length))
}

function windowStats(readings: TrendReading[], startMs: number, endMs: number): TrendStats {
  let count = 0
  let crisisCount = 0
  const sys: number[] = []
  const dia: number[] = []
  const pulse: number[] = []
  const days = new Set<string>()

  for (const r of readings) {
    const ts = new Date(r.measured_at).getTime()
    if (ts < startMs || ts >= endMs) continue
    count++
    sys.push(r.systolic)
    dia.push(r.diastolic)
    if (r.pulse) pulse.push(r.pulse)
    days.add(localDayKey(new Date(r.measured_at)))
    if (r.systolic > 180 || r.diastolic > 120) crisisCount++
  }

  return {
    count,
    daysWithData: days.size,
    avgSys: mean(sys),
    avgDia: mean(dia),
    avgPulse: mean(pulse),
    stdDevSys: stdev(sys),
    stdDevDia: stdev(dia),
    crisisCount,
  }
}

export function trendStats(
  readings: TrendReading[],
  days: number,
  now = new Date(),
): { current: TrendStats; previous: TrendStats } {
  const end = now.getTime()
  const start = end - days * MS_PER_DAY
  return {
    current: windowStats(readings, start, end),
    previous: windowStats(readings, start - days * MS_PER_DAY, start),
  }
}

export function diffVsPrevious(current: TrendStats, previous: TrendStats): TrendDiff {
  const diff = (a: number | null, b: number | null) =>
    a == null || b == null ? null : Math.round(a - b)
  return {
    avgSys: diff(current.avgSys, previous.avgSys),
    avgDia: diff(current.avgDia, previous.avgDia),
  }
}

export function dailyTrendPoints(
  readings: TrendReading[],
  days: number,
  now = new Date(),
): TrendDailyPoint[] {
  const end = now.getTime()
  const start = end - days * MS_PER_DAY

  const sysByDay = new Map<string, number[]>()
  const diaByDay = new Map<string, number[]>()
  const buckets = new Map<string, TrendDailyPoint>()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end - i * MS_PER_DAY)
    buckets.set(localDayKey(date), { date, count: 0, sys: null, dia: null })
  }

  for (const r of readings) {
    const ts = new Date(r.measured_at).getTime()
    if (ts < start || ts >= end) continue
    const key = localDayKey(new Date(r.measured_at))
    if (!buckets.has(key)) continue
    if (!sysByDay.has(key)) {
      sysByDay.set(key, [])
      diaByDay.set(key, [])
    }
    sysByDay.get(key)!.push(r.systolic)
    diaByDay.get(key)!.push(r.diastolic)
  }

  return [...buckets.values()].map((p) => {
    const key = localDayKey(p.date)
    const sys = sysByDay.get(key)
    const dia = diaByDay.get(key)
    return {
      date: p.date,
      count: sys?.length ?? 0,
      sys: mean(sys ?? []),
      dia: mean(dia ?? []),
    }
  })
}