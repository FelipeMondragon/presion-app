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

export type BucketStats = {
  count: number
  avgSys: number | null
  avgDia: number | null
}

export function timeOfDayStats(
  readings: TrendReading[],
  timeZone: string,
): { morning: BucketStats; rest: BucketStats } {
  const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone })
  const sys = { morning: [] as number[], rest: [] as number[] }
  const dia = { morning: [] as number[], rest: [] as number[] }

  for (const r of readings) {
    const date = new Date(r.measured_at)
    if (Number.isNaN(date.getTime())) continue
    const hour = Number(hourFmt.formatToParts(date).find((p) => p.type === "hour")?.value ?? "12")
    const bucket = hour < 12 ? "morning" : "rest"
    sys[bucket].push(r.systolic)
    dia[bucket].push(r.diastolic)
  }

  return {
    morning: { count: sys.morning.length, avgSys: mean(sys.morning), avgDia: mean(dia.morning) },
    rest: { count: sys.rest.length, avgSys: mean(sys.rest), avgDia: mean(dia.rest) },
  }
}

export type TargetRate = {
  count: number
  inRange: number
  pct: number | null
}

function targetRate(
  readings: TrendReading[],
  startMs: number,
  endMs: number,
  targetSys: number,
  targetDia: number,
): TargetRate {
  let count = 0
  let inRange = 0

  for (const r of readings) {
    const ts = new Date(r.measured_at).getTime()
    if (Number.isNaN(ts) || ts < startMs || ts >= endMs) continue
    count++
    if (r.systolic < targetSys && r.diastolic < targetDia) inRange++
  }

  return { count, inRange, pct: count ? Math.round((inRange / count) * 100) : null }
}

export function targetRateStats(
  readings: TrendReading[],
  days: number,
  now = new Date(),
  targetSys = 130,
  targetDia = 80,
): { current: TargetRate; previous: TargetRate } {
  const end = now.getTime()
  const start = end - days * MS_PER_DAY
  return {
    current: targetRate(readings, start, end, targetSys, targetDia),
    previous: targetRate(readings, start - days * MS_PER_DAY, start, targetSys, targetDia),
  }
}

export type HalfStats = {
  count: number
  avgSys: number | null
  avgDia: number | null
}

export function halvesStats(readings: TrendReading[]): { first: HalfStats; second: HalfStats } {
  const valid = readings
    .map((r) => ({ ts: new Date(r.measured_at).getTime(), r }))
    .filter((x) => !Number.isNaN(x.ts))
    .sort((a, b) => a.ts - b.ts)

  const pack = (items: typeof valid): HalfStats => ({
    count: items.length,
    avgSys: mean(items.map((x) => x.r.systolic)),
    avgDia: mean(items.map((x) => x.r.diastolic)),
  })

  if (valid.length === 0) {
    return { first: pack([]), second: pack([]) }
  }

  // split at the median timestamp so both halves hold ~the same number of readings
  const mid = valid[Math.floor(valid.length / 2)].ts
  return {
    first: pack(valid.filter((x) => x.ts < mid)),
    second: pack(valid.filter((x) => x.ts >= mid)),
  }
}
