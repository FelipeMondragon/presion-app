import { readFileSync } from "fs"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { eq } from "drizzle-orm"
import { hash } from "bcryptjs"
import { users, measurements, reminderSettings } from "./schema"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seed(db: any) {
  const existing = await db.select().from(users).where(eq(users.email, "test@example.com")).limit(1)
  if (existing.length > 0) return

  console.log("🌱 Seeding database...")

  const adminId = crypto.randomUUID()
  const adminPasswordHash = await hash("admin1234", 12)

  await db.insert(users).values({
    id: adminId,
    email: "admin@example.com",
    passwordHash: adminPasswordHash,
    name: "Administrador",
    username: "admin",
    role: "admin",
  })

  const userId = crypto.randomUUID()
  const passwordHash = await hash("test1234", 12)
  const securityAnswerHash = await hash("Firulais", 10)

  await db.insert(users).values({
    id: userId,
    email: "test@example.com",
    passwordHash,
    name: "Paciente de prueba",
    username: "testuser",
    securityQuestion: "pregunta1",
    securityAnswer: securityAnswerHash,
  })

  const now = new Date()
  const measurementsData: (typeof measurements.$inferInsert)[] = []

  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const isMorning = i % 2 === 0
    date.setHours(
      isMorning ? 8 + Math.floor(Math.random() * 3) : 18 + Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 60),
    )

    const baseSystolic = 125 + Math.sin(i * 0.3) * 10
    const baseDiastolic = 80 + Math.sin(i * 0.3 + 1) * 8
    const basePulse = 70 + Math.sin(i * 0.2 + 2) * 8

    const systolic = Math.round(baseSystolic + (Math.random() - 0.5) * 14)
    const diastolic = Math.round(baseDiastolic + (Math.random() - 0.5) * 10)
    const pulse = Math.round(basePulse + (Math.random() - 0.5) * 12)

    const arm = Math.random() > 0.5 ? "left" : "right"
    const position = (["sitting", "standing", "lying"] as const)[Math.floor(Math.random() * 3)]

    const notes =
      i === 0 ? "Después del café" :
      i === 3 ? "Sintió mareo leve" :
      i === 15 ? "Después de caminar" :
      null

    measurementsData.push({
      id: crypto.randomUUID(),
      userId,
      systolic,
      diastolic,
      pulse: pulse > 0 ? pulse : undefined,
      arm,
      position,
      notes,
      measuredAt: date.toISOString(),
    })
  }

  await db.insert(measurements).values(measurementsData)

  await db.insert(reminderSettings).values({
    userId,
    times: JSON.stringify(["08:00", "20:00"]),
    emailEnabled: true,
    browserEnabled: true,
    timezone: "America/Chihuahua",
  })

  console.log("✅ Seed data created (admin@example.com / admin1234, test@example.com / test1234)")
}

const isMainScript = process.argv[1]?.replace(/\\/g, "/").endsWith("seed.ts")
if (isMainScript) {
  const envPath = ".env.local"
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

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const db = drizzle(client)

  seed(db)
    .then(() => client.close())
    .catch((err) => {
      console.error("❌ Seeding failed:", err)
      process.exit(1)
    })
}
