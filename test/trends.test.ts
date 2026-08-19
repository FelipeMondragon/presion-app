import { strictEqual } from "node:assert"
import {
  trendStats,
  diffVsPrevious,
  dailyTrendPoints,
  weekdayPattern,
  type TrendReading,
} from "../src/lib/bp-trends"

const noon = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12).toISOString()

const TZ = "America/Mexico_City"
const LOC = "es-MX"
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

// Weekday grouping: 2024 Mondays are Jan 1, 8, 15, 22, 29 (12:00 UTC -> Monday in MX)
{
  const mondays = ["2024-01-01T12:00:00.000Z", "2024-01-08T12:00:00.000Z", "2024-01-15T12:00:00.000Z", "2024-01-22T12:00:00.000Z"].map((iso) => r(iso, 140, 90))
  const tuesdays = ["2024-01-02T12:00:00.000Z", "2024-01-09T12:00:00.000Z", "2024-01-16T12:00:00.000Z", "2024-01-23T12:00:00.000Z"].map((iso) => r(iso, 120))
  const pattern = weekdayPattern([...mondays, ...tuesdays], TZ, LOC)
  strictEqual(pattern.stats[1].count, 4) // Monday
  strictEqual(pattern.stats[1].avgSys, 140)
  strictEqual(pattern.stats[2].count, 4) // Tuesday
  strictEqual(pattern.stats[2].avgSys, 120)
}

// Weekday boundary: a reading just after midnight local lands on the next day
{
  const readings = [
    r("2024-01-01T00:30:00.000Z", 120), // 2023-12-31 18:30 in MX -> Sunday
    r("2024-01-01T07:00:00.000Z", 130), // 2024-01-01 01:00 in MX -> Monday
  ]
  const pattern = weekdayPattern(readings, TZ, LOC)
  strictEqual(pattern.stats[0].count, 1) // Sunday
  strictEqual(pattern.stats[1].count, 1) // Monday
}

// Not enough readings per day -> no pattern
{
  const readings = ["2024-01-01T12:00:00.000Z", "2024-01-08T12:00:00.000Z", "2024-01-15T12:00:00.000Z"].map((iso) => r(iso, 140))
  const pattern = weekdayPattern(readings, TZ, LOC)
  strictEqual(pattern.direction, "insufficient")
}

// Data spans less than 28 days -> insufficient even with 4 readings per weekday
{
  const readings = ["2024-01-01T12:00:00.000Z", "2024-01-08T12:00:00.000Z", "2024-01-15T12:00:00.000Z", "2024-01-22T12:00:00.000Z"].map((iso) => r(iso, 140))
  strictEqual(weekdayPattern(readings, TZ, LOC).direction, "insufficient")
}

// Small differences -> no clear pattern
{
  const readings: TrendReading[] = []
  for (let w = 0; w < 4; w++) {
    for (let d = 0; d < 7; d++) {
      // Jan 8 2024 is a Monday; one reading per weekday for 4 weeks
      const dt = new Date(Date.UTC(2024, 0, 8 + d + w * 7, 12))
      readings.push(r(dt.toISOString(), 120))
    }
  }
  strictEqual(weekdayPattern(readings, TZ, LOC).direction, "none")
}

// A clearly higher weekday -> "high" pattern with that day
{
  const mondays = ["2024-01-01T12:00:00.000Z", "2024-01-08T12:00:00.000Z", "2024-01-15T12:00:00.000Z", "2024-01-22T12:00:00.000Z", "2024-01-29T12:00:00.000Z"].map((iso) => r(iso, 140, 90))
  const others: TrendReading[] = []
  for (let w = 0; w < 4; w++) {
    for (let d = 1; d <= 6; d++) {
      // Tuesday..Sunday: Jan 9 + d + w*7 (Jan 9 2024 is a Tuesday)
      const dt = new Date(Date.UTC(2024, 0, 9 + d + w * 7, 12))
      others.push(r(dt.toISOString(), 120))
    }
  }
  const pattern = weekdayPattern([...mondays, ...others], TZ, LOC)
  strictEqual(pattern.direction, "high")
  strictEqual(pattern.stat?.index, 1) // Monday
}

// Empty history does not break the pattern helper
{
  const pattern = weekdayPattern([], TZ, LOC)
  strictEqual(pattern.direction, "insufficient")
  strictEqual(pattern.stats.length, 7)
}

console.log("✅ trends.test.ts — all assertions passed")