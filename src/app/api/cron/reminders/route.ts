import { NextResponse } from "next/server"
import { db } from "@/db/client"
import { reminderSettings, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

async function sendReminder(to: string, from: string, transporter: nodemailer.Transporter): Promise<boolean> {
  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Recordatorio de medición | Presión App",
      text: [
        "Hola,",
        "",
        "Es hora de medir tu presión arterial.",
        "",
        "Recordá:",
        "• Sentate en una silla con la espalda apoyada",
        "• Apoyá el brazo a la altura del corazón",
        "• No hables ni te muevas durante la medición",
        "• Esperá 5 minutos de reposo antes de medir",
        "",
        "Registrá tu lectura en la app.",
        "",
        "— Presión App",
      ].join("\n"),
    })
    return true
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  const settings = await db
    .select({
      userId: reminderSettings.userId,
      email: users.email,
      times: reminderSettings.times,
    })
    .from(reminderSettings)
    .innerJoin(users, eq(reminderSettings.userId, users.id))
    .where(eq(reminderSettings.emailEnabled, true))

  const matching = settings.filter((s) => {
    try {
      const times: string[] = JSON.parse(s.times)
      return times.includes(currentTime)
    } catch {
      return false
    }
  })

  if (matching.length === 0) {
    return NextResponse.json(
      { sent: 0, message: "No reminders for this time" },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const REMINDER_FROM = process.env.REMINDER_FROM
  if (!REMINDER_FROM) {
    return NextResponse.json(
      { sent: 0, message: "REMINDER_FROM not configured" },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const transporter = createTransporter()
  if (!transporter) {
    return NextResponse.json(
      { sent: 0, message: "SMTP not configured" },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const results = []
  for (const setting of matching) {
    if (!setting.email) continue

    const ok = await sendReminder(setting.email, REMINDER_FROM, transporter)
    results.push({ email: setting.email, status: ok ? "sent" : "failed" })
  }

  return NextResponse.json(
    { sent: results.filter((r) => r.status === "sent").length, results },
    { headers: { "Cache-Control": "no-store" } },
  )
}
