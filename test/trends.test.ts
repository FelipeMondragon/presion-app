import { strictEqual } from "node:assert"
import {
  trendStats,
  diffVsPrevious,
  dailyTrendPoints,
  timeOfDayStats,
  targetRateStats,
  halvesStats,
  type TrendReading,
} from "../src/lib/bp-trends"

const noon = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12).toISOString()

const TZ = "America/Mexico_City"
function r(iso: string, systolic: number, diastolic = 80): TrendReading {
  return { measured_at: iso, systolic, diastolic }
}

// Averages and window boundaries
{
  const now = new Date(2024, 0, 31, 12) // Jan 31, 2024
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 21), systolic: 140, diastolic: 90 },
    { measured_at: noon(2024, 1, 11), systolic: 120, diastolic: 80 },
    { measured_at: noon(2024, 1, 26), systolic: 150, diastolic: 100 },
    { measured_at: noon(2023, 12, 29), systolic: 200, diastolic: 200 }, // outside current window, inside previous 30d
  ]
  const { current, previous } = trendStats(readings, 30, now)
  strictEqual(current.count, 3)
  strictEqual(current.daysWithData, 3)
  strictEqual(current.avgSys, 137)
  strictEqual(current.avgDia, 90)
  strictEqual(previous.count, 1)
}

// Single reading: average exists, variance is null
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 10), systolic: 125, diastolic: 85, pulse: 70 },
    { measured_at: noon(2024, 1, 11), systolic: 130, diastolic: 87, pulse: 74 },
  ]
  const { current } = trendStats(readings, 30, now)
  strictEqual(current.count, 2)
  strictEqual(current.avgSys, 128)
  strictEqual(current.stdDevSys, 3)
  strictEqual(current.avgPulse, 72)
}

// Population stdev with exactly two readings
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 10), systolic: 120, diastolic: 80 },
    { measured_at: noon(2024, 1, 11), systolic: 140, diastolic: 80 },
  ]
  const { current } = trendStats(readings, 30, now)
  strictEqual(current.stdDevSys, 10)
  strictEqual(current.stdDevDia, 0)
}

// Crisis count: >180 systolic or >120 diastolic, exactly 180/120 is NOT a crisis
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 10), systolic: 181, diastolic: 100 },
    { measured_at: noon(2024, 1, 11), systolic: 150, diastolic: 121 },
    { measured_at: noon(2024, 1, 12), systolic: 180, diastolic: 120 },
  ]
  const { current } = trendStats(readings, 30, now)
  strictEqual(current.count, 3)
  strictEqual(current.crisisCount, 2)
}

// Previous window comparison
{
  const now = new Date(2024, 1, 15, 12) // Feb 15, 2024 at noon
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 1), systolic: 120, diastolic: 80 }, // Jan 1 -> previous (before Feb 15 - 30d = Jan 16)
    { measured_at: noon(2024, 2, 5), systolic: 180, diastolic: 120 }, // Feb 5 -> current
  ]
  const { current, previous } = trendStats(readings, 30, now)
  strictEqual(previous.count, 1)
  strictEqual(current.count, 1)
  const diff = diffVsPrevious(current, previous)
  strictEqual(diff.avgSys, 60)
  strictEqual(diff.avgDia, 40)
}

// No previous data -> diff is null
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [{ measured_at: noon(2024, 1, 10), systolic: 120, diastolic: 80 }]
  const { current, previous } = trendStats(readings, 30, now)
  const diff = diffVsPrevious(current, previous)
  strictEqual(diff.avgSys, null)
  strictEqual(diff.avgDia, null)
}

// Daily grouping: multiple readings on the same local day collapse into one point
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 10), systolic: 120, diastolic: 80 },
    { measured_at: new Date(2024, 0, 10, 18).toISOString(), systolic: 124, diastolic: 84 },
    { measured_at: noon(2024, 1, 20), systolic: 200, diastolic: 200 },
  ]
  const points = dailyTrendPoints(readings, 30, now)
  const withData = points.filter((p) => p.count > 0)
  strictEqual(withData.length, 2)
  strictEqual(withData[0].count, 2)
  strictEqual(withData[0].sys, 122)
  strictEqual(withData[0].dia, 82)
}

// Missing days keep count 0 and null values (chart must not fabricate a 0)
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 10), systolic: 120, diastolic: 80 },
    { measured_at: noon(2024, 1, 20), systolic: 130, diastolic: 85 },
  ]
  const points = dailyTrendPoints(readings, 30, now)
  const day12 = points.find((p) => p.date.getDate() === 12)
  strictEqual(day12?.count, 0)
  strictEqual(day12?.sys, null)
  strictEqual(day12?.dia, null)
}

// No readings
{
  const now = new Date(2024, 0, 31, 12)
  const { current, previous } = trendStats([], 30, now)
  strictEqual(current.count, 0)
  strictEqual(current.avgSys, null)
  strictEqual(previous.count, 0)
  strictEqual(dailyTrendPoints([], 30, now).every((p) => p.count === 0), true)
}

// Time of day: morning = before 12:00 local (Mexico City is UTC-6 in January)
{
  const readings = [
    r("2024-01-10T14:00:00.000Z", 130), // 08:00 local
    r("2024-01-10T15:00:00.000Z", 134, 82), // 09:00 local
    r("2024-01-10T17:59:00.000Z", 126, 78), // 11:59 local
    r("2024-01-10T18:00:00.000Z", 120, 76), // 12:00 local
    r("2024-01-11T02:00:00.000Z", 118, 74), // 20:00 local
  ]
  const { morning, rest } = timeOfDayStats(readings, TZ)
  strictEqual(morning.count, 3)
  strictEqual(morning.avgSys, 130)
  strictEqual(rest.count, 2)
  strictEqual(rest.avgSys, 119)
  strictEqual(rest.avgDia, 75)
}

// Time of day respects the user's timezone: 17:59Z is 11:59 in Mexico City
{
  const readings = [r("2024-01-10T17:59:00.000Z", 120)]
  strictEqual(timeOfDayStats(readings, TZ).morning.count, 1)
  strictEqual(timeOfDayStats(readings, "UTC").rest.count, 1)
}

// In-range rate: strict <130/80, current vs previous window
{
  const now = new Date(2024, 0, 31, 12)
  const readings: TrendReading[] = [
    { measured_at: noon(2024, 1, 5), systolic: 120, diastolic: 79 }, // current, in
    { measured_at: noon(2024, 1, 10), systolic: 129, diastolic: 79 }, // current, in
    { measured_at: noon(2024, 1, 15), systolic: 130, diastolic: 79 }, // current, out (sys must be < 130)
    { measured_at: noon(2024, 1, 20), systolic: 120, diastolic: 80 }, // current, out (dia must be < 80)
    { measured_at: noon(2023, 12, 20), systolic: 150, diastolic: 95 }, // previous, out
  ]
  const { current, previous } = targetRateStats(readings, 30, now)
  strictEqual(current.count, 4)
  strictEqual(current.inRange, 2)
  strictEqual(current.pct, 50)
  strictEqual(previous.count, 1)
  strictEqual(previous.pct, 0)
}

// No readings -> null rate
{
  const { current, previous } = targetRateStats([], 30, new Date(2024, 0, 31, 12))
  strictEqual(current.count, 0)
  strictEqual(current.pct, null)
  strictEqual(previous.pct, null)
}

// Halves split at the median timestamp, evenly by count
{
  const readings = [
    r("2024-01-01T12:00:00.000Z", 100),
    r("2024-01-02T12:00:00.000Z", 110),
    r("2024-01-03T12:00:00.000Z", 120),
    r("2024-01-04T12:00:00.000Z", 130),
  ]
  const { first, second } = halvesStats(readings)
  strictEqual(first.count, 2)
  strictEqual(first.avgSys, 105)
  strictEqual(second.count, 2)
  strictEqual(second.avgSys, 125)
}

// Halves do not depend on input order; empty input is safe
{
  const shuffled = [
    r("2024-01-04T12:00:00.000Z", 130),
    r("2024-01-01T12:00:00.000Z", 100),
    r("2024-01-03T12:00:00.000Z", 120),
    r("2024-01-02T12:00:00.000Z", 110),
  ]
  strictEqual(halvesStats(shuffled).first.avgSys, 105)
  const empty = halvesStats([])
  strictEqual(empty.first.count, 0)
  strictEqual(empty.first.avgSys, null)
  strictEqual(empty.second.count, 0)
}

console.log("✅ trends.test.ts — all assertions passed")
