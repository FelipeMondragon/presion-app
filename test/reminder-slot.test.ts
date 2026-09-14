import { strictEqual } from "node:assert"
import { currentSlot } from "../src/lib/reminder-slot"

const at = new Date("2026-01-02T08:00:00Z")

strictEqual(currentSlot(["08:00"], "UTC", at), "2026-01-02T08:00")
strictEqual(currentSlot(["20:00"], "UTC", at), null)
strictEqual(currentSlot([], "UTC", at), null)

// user timezone wins: 08:00Z is 03:00 in New York (January)
strictEqual(currentSlot(["08:00"], "America/New_York", at), null)
strictEqual(currentSlot(["03:00"], "America/New_York", at), "2026-01-02T03:00")

// midnight stays 00:00, not 24:00
const midnight = new Date("2026-01-02T00:00:00Z")
strictEqual(currentSlot(["00:00"], "UTC", midnight), "2026-01-02T00:00")

// invalid timezone is rejected by the caller, not crash here
strictEqual(currentSlot(["08:00"], "", at), "2026-01-02T08:00")

console.log("✅ reminder-slot.test.ts — all assertions passed")
