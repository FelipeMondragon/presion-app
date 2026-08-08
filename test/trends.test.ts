import { strictEqual } from "node:assert"
import {
  trendStats,
  diffVsPrevious,
  dailyTrendPoints,
  type TrendReading,
} from "../src/lib/bp-trends"

const noon = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12).toISOString()

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

// No readings
{
  const now = new Date(2024, 0, 31, 12)
  const { current, previous } = trendStats([], 30, now)
  strictEqual(current.count, 0)
  strictEqual(current.avgSys, null)
  strictEqual(previous.count, 0)
  strictEqual(dailyTrendPoints([], 30, now).every((p) => p.count === 0), true)
}

console.log("✅ trends.test.ts — all assertions passed")