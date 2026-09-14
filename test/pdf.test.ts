import { ok, strictEqual } from "node:assert"
import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { isPdf, formatDate } from "../src/lib/utils"
import { generatePDF } from "../src/lib/pdf-report"
import { getTranslations } from "../src/lib/translations"
import type { Measurement } from "../src/lib/types"

const enc = (s: string) => new TextEncoder().encode(s)

strictEqual(isPdf(enc("%PDF-1.7")), true)
strictEqual(isPdf(enc("%PDF-")), true)
strictEqual(isPdf(enc("PK\u0003\u0004")), false)
strictEqual(isPdf(enc("%PD")), false)
strictEqual(isPdf(enc("hello")), false)
strictEqual(isPdf(new Uint8Array(0)), false)

strictEqual(
  formatDate("2026-03-17", "es", { dateStyle: "short" }),
  formatDate(new Date(2026, 2, 17), "es", { dateStyle: "short" })
)

const sample: Measurement[] = Array.from({ length: 42 }, (_, i) => {
  const d = new Date(2026, 2, 17, 8 + (i % 3) * 4, (i * 7) % 60)
  d.setDate(d.getDate() + i)
  const systolic = 116 + Math.round(24 * Math.sin(i / 3.4)) + (i % 6)
  const diastolic = Math.round(systolic * 0.62) + (i % 4)
  return {
    id: `sample-${i}`,
    user_id: "sample-user",
    systolic,
    diastolic,
    pulse: 62 + ((i * 5) % 18),
    arm: i % 2 === 0 ? "left" : "right",
    position: i % 3 === 0 ? "sitting" : i % 3 === 1 ? "lying" : "standing",
    notes: i % 9 === 0 ? "Nota de prueba con texto largo para ver el ajuste de la columna" : null,
    measured_at: d.toISOString(),
    created_at: d.toISOString(),
  }
})

const doc = generatePDF(sample, "Paciente de Prueba", "2026-03-17", "2026-05-01", getTranslations("es"), "es")
const bytes = new Uint8Array(doc.output("arraybuffer"))
ok(isPdf(bytes), "generated PDF has %PDF- header")

const dir = join(tmpdir(), "opencode")
mkdirSync(dir, { recursive: true })
const samplePath = join(dir, "presion-sample.pdf")
writeFileSync(samplePath, bytes)

console.log(`✅ pdf.test.ts — all assertions passed`)
console.log(`   sample: ${samplePath}`)
