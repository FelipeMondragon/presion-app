import { readFileSync } from "fs"
import { createClient } from "@libsql/client"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import { eq } from "drizzle-orm"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { users, measurements } from "./schema"

// ponytail: dev-only dummy data. Re-runs skip users that already exist, so it is resume-safe.
const PROFILES = [
  { label: "Normal", systolic: 118, diastolic: 76, pulse: 68 },
  { label: "Elevada", systolic: 128, diastolic: 82, pulse: 72 },
  { label: "Hipertension 1", systolic: 142, diastolic: 92, pulse: 78 },
  { label: "Hipertension 2", systolic: 165, diastolic: 103, pulse: 84 },
  { label: "Hipotension", systolic: 98, diastolic: 62, pulse: 60 },
  { label: "Inestable", systolic: 150, diastolic: 95, pulse: 88 },
  { label: "Normal", systolic: 122, diastolic: 79, pulse: 70 },
  { label: "Elevada", systolic: 133, diastolic: 85, pulse: 74 },
] as const

const arg = (name: string, fallback: number) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  const value = hit ? parseInt(hit.split("=")[1], 10) : NaN
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export async function seedDummy(db: LibSQLDatabase, userCount: number, totalCount: number) {
  // ponytail: one bcrypt hash reused by every dummy — same test password, test data only
  const passwordHash = await hash("test1234", 12)
  const perUser = Math.max(1, Math.round(totalCount / userCount))

  for (let i = 0; i < userCount; i++) {
    const n = i + 1
    const email = `dummy${n}@example.com`
    const profile = PROFILES[i % PROFILES.length]

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      console.log(`⏭️  ${email} ya existe, se salta`)
      continue
    }

    const userId = crypto.randomUUID()
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      name: `Paciente Dummy ${profile.label} ${n}`,
      username: `dummy${n}`,
    })

    const rows: (typeof measurements.$inferInsert)[] = []
    const now = Date.now()

    for (let j = 0; j < perUser; j++) {
      const daysAgo = Math.floor((j / perUser) * 180)
      const date = new Date(now - daysAgo * 86_400_000)
      date.setHours([8, 14, 20][j % 3] + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0)

      const wave = Math.sin(j * 0.15) * 8
      let systolic = Math.round(profile.systolic + wave + (Math.random() - 0.5) * 14)
      const diastolic = Math.round(profile.diastolic + wave * 0.6 + (Math.random() - 0.5) * 10)
      const pulse = Math.round(profile.pulse + (Math.random() - 0.5) * 12)

      // ponytail: spread outliers so classifier and chart color ranges get exercised
      if (j % 47 === 23) systolic += 38
      if (j % 53 === 17) systolic -= 22

      const notes =
        j === 0 ? "Primera medición del día" :
        j % 37 === 5 ? "Sintió mareo leve" :
        j % 41 === 9 ? "Después de caminar" :
        null

      rows.push({
        id: crypto.randomUUID(),
        userId,
        systolic,
        diastolic,
        pulse: pulse > 0 ? pulse : undefined,
        arm: Math.random() > 0.5 ? "left" : "right",
        position: (["sitting", "standing", "lying"] as const)[Math.floor(Math.random() * 3)],
        notes,
        measuredAt: date.toISOString(),
      })
    }

    // ponytail: 19 rows per statement keeps params under Turso's ~200 limit (10 cols each)
    for (let k = 0; k < rows.length; k += 19) {
      await db.insert(measurements).values(rows.slice(k, k + 19))
    }

    console.log(`✅ ${email} → ${rows.length} mediciones (${profile.label})`)
  }

  console.log(`\nTotal objetivo: ${userCount} usuarios × ${perUser} mediciones`)
}

const isMainScript = process.argv[1]?.replace(/\\/g, "/").endsWith("seed-dummy.ts")
if (isMainScript) {
  const envPath = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local"
  try {
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.error("❌ .env.local not found")
    process.exit(1)
  }

  if (process.env.NODE_ENV === "production") {
    console.error("❌ seed-dummy is dev-only")
    process.exit(1)
  }

  const userCount = arg("users", 8)
  const totalCount = arg("count", 1000)
  console.log(`🌱 ${userCount} usuarios dummy, ~${totalCount} mediciones → ${process.env.TURSO_DATABASE_URL?.split("?")[0]}\n`)

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const db = drizzle(client)

  seedDummy(db, userCount, totalCount)
    .then(() => client.close())
    .catch((err) => {
      console.error("❌ Seed dummy failed:", err.message)
      process.exit(1)
    })
}
