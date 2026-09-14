import { strictEqual } from "node:assert"
import { measurementSchema } from "../src/lib/validators"

function ok(body: Record<string, unknown>): boolean {
  return measurementSchema.safeParse(body).success
}

// Valid boundaries
strictEqual(ok({ systolic: 160, diastolic: 90, pulse: 72 }), true)
strictEqual(ok({ systolic: 300, diastolic: 200, pulse: 250 }), true)
strictEqual(ok({ systolic: 50, diastolic: 30, pulse: 30 }), true)
strictEqual(ok({ systolic: 160, diastolic: 90, pulse: null }), true)
strictEqual(ok({ systolic: 160, diastolic: 90 }), true)

// Out-of-range values rejected (e.g. 16.000.000.000)
strictEqual(ok({ systolic: 16000000000, diastolic: 90 }), false)
strictEqual(ok({ systolic: 160, diastolic: 16000000000 }), false)
strictEqual(ok({ systolic: 160, diastolic: 90, pulse: 99999999 }), false)

// Just past the boundary
strictEqual(ok({ systolic: 301, diastolic: 90 }), false)
strictEqual(ok({ systolic: 49, diastolic: 90 }), false)
strictEqual(ok({ systolic: 160, diastolic: 201 }), false)
strictEqual(ok({ systolic: 160, diastolic: 29 }), false)
strictEqual(ok({ systolic: 160, diastolic: 90, pulse: 251 }), false)
strictEqual(ok({ systolic: 160, diastolic: 90, pulse: 29 }), false)

// Systolic must exceed diastolic
strictEqual(ok({ systolic: 80, diastolic: 120 }), false)
strictEqual(ok({ systolic: 120, diastolic: 120 }), false)
strictEqual(ok({ systolic: 121, diastolic: 120 }), true)

// measured_at must be parseable and is normalised to ISO
strictEqual(ok({ systolic: 160, diastolic: 90, measured_at: "not-a-date" }), false)
strictEqual(ok({ systolic: 160, diastolic: 90, measured_at: "2026-01-02T03:04:05Z" }), true)
const parsed = measurementSchema.parse({ systolic: 160, diastolic: 90, measured_at: "2026-01-02T03:04:05Z" })
strictEqual(parsed.measured_at, "2026-01-02T03:04:05.000Z")

console.log("✅ measurement.test.ts — all assertions passed")