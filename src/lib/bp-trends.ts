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

export type WeekdayStat = {
  index: number
  label: string
  count: number
  avgSys: number | null
  avgDia: number | null
}

export type WeekdayPattern = {
  direction: "high" | "low" | "none" | "insufficient"
  stat: WeekdayStat | null
  baselineSys: number | null
  baselineDia: number | null
  totalCount: number
  spanDays: number
  minPerDay: number
  minSpanDays: number
  stats: WeekdayStat[]
}

// ponytail: heuristic, not medical advice. Thresholds are conservative on purpose;
// tune minPerDay/minDiffSys if real users report noise.
const WEEKDAY_MIN_PER_DAY = 4
const WEEKDAY_MIN_SPAN_DAYS = 28
const WEEKDAY_MIN_DIFF_SYS = 5

// Jan 7 2024 12:00 UTC is a Sunday; labels stay deterministic in any timezone
const WEEKDAY_LABEL_REF = Date.UTC(2024, 0, 7, 12)

function weekdayIndex(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).formatToParts(new Date(iso))
  const value = parts.find((p) => p.type === "weekday")?.value
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value ?? "")
  return index >= 0 ? index : 0
}

function weekdayLabel(index: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
    new Date(WEEKDAY_LABEL_REF + index * MS_PER_DAY)
  )
}

export function weekdayPattern(
  readings: TrendReading[],
  timeZone: string,
  locale: string,
): WeekdayPattern {
  const sysByDay = Array.from({ length: 7 }, () => [] as number[])
  const diaByDay = Array.from({ length: 7 }, () => [] as number[])
  const allSys: number[] = []
  const allDia: number[] = []
  let minTs = Infinity
  let maxTs = -Infinity

  for (const r of readings) {
    const ts = new Date(r.measured_at).getTime()
    if (Number.isNaN(ts)) continue
    minTs = Math.min(minTs, ts)
    maxTs = Math.max(maxTs, ts)
    const i = weekdayIndex(r.measured_at, timeZone)
    sysByDay[i].push(r.systolic)
    diaByDay[i].push(r.diastolic)
    allSys.push(r.systolic)
    allDia.push(r.diastolic)
  }

  const spanDays = readings.length === 0 ? 0 : Math.floor((maxTs - minTs) / MS_PER_DAY) + 1
  const stats: WeekdayStat[] = Array.from({ length: 7 }, (_, i) => ({
    index: i,
    label: weekdayLabel(i, locale),
    count: sysByDay[i].length,
    avgSys: mean(sysByDay[i]),
    avgDia: mean(diaByDay[i]),
  }))

  const baselineSys = mean(allSys)
  const baselineDia = mean(allDia)

  const enough = stats.some((s) => s.count >= WEEKDAY_MIN_PER_DAY)
  if (spanDays < WEEKDAY_MIN_SPAN_DAYS || !enough) {
    return {
      direction: "insufficient",
      stat: null,
      baselineSys,
      baselineDia,
      totalCount: allSys.length,
      spanDays,
      minPerDay: WEEKDAY_MIN_PER_DAY,
      minSpanDays: WEEKDAY_MIN_SPAN_DAYS,
      stats,
    }
  }

  const valid = stats.filter((s) => s.count >= WEEKDAY_MIN_PER_DAY && s.avgSys != null)
  const highest = valid.reduce((a, b) => (a.avgSys! > b.avgSys! ? a : b))
  const lowest = valid.reduce((a, b) => (a.avgSys! < b.avgSys! ? a : b))

  if (baselineSys != null && highest.avgSys != null && highest.avgSys >= baselineSys + WEEKDAY_MIN_DIFF_SYS) {
    return { direction: "high", stat: highest, baselineSys, baselineDia, totalCount: allSys.length, spanDays, minPerDay: WEEKDAY_MIN_PER_DAY, minSpanDays: WEEKDAY_MIN_SPAN_DAYS, stats }
  }
  if (baselineSys != null && lowest.avgSys != null && lowest.avgSys <= baselineSys - WEEKDAY_MIN_DIFF_SYS) {
    return { direction: "low", stat: lowest, baselineSys, baselineDia, totalCount: allSys.length, spanDays, minPerDay: WEEKDAY_MIN_PER_DAY, minSpanDays: WEEKDAY_MIN_SPAN_DAYS, stats }
  }
  return { direction: "none", stat: null, baselineSys, baselineDia, totalCount: allSys.length, spanDays, minPerDay: WEEKDAY_MIN_PER_DAY, minSpanDays: WEEKDAY_MIN_SPAN_DAYS, stats }
}