import { strictEqual } from "node:assert"
import { formatChartTick } from "../src/lib/utils"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// Intraday span -> compact 24h time
strictEqual(formatChartTick(Date.UTC(2024, 0, 10, 15, 30), 5 * HOUR, "es", "UTC"), "15:30")

// Up to ~6 months -> day/month
strictEqual(formatChartTick(Date.UTC(2024, 0, 10, 15, 30), 30 * DAY, "es", "UTC"), "10/01")

// Longer history -> month/year (avoids ambiguity between years)
strictEqual(formatChartTick(Date.UTC(2024, 2, 5, 12), 400 * DAY, "es", "UTC"), "03/24")
strictEqual(formatChartTick(Date.UTC(2024, 2, 5, 12), 400 * DAY, "en", "UTC"), "03/24")

// Boundary: exactly 24h is not intraday, exactly 180 days keeps day/month
strictEqual(formatChartTick(Date.UTC(2024, 0, 10, 15, 30), DAY, "es", "UTC"), "10/01")
strictEqual(formatChartTick(Date.UTC(2024, 0, 10, 15, 30), 180 * DAY, "es", "UTC"), "10/01")

console.log("✅ chart-tick.test.ts — all assertions passed")
