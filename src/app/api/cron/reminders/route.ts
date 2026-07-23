import { NextResponse } from "next/server"
import { db } from "@/db/client"
import { reminderSettings, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import nodemailer from "nodemailer"
import { createTransporter } from "@/lib/mail"

export const dynamic = "force-dynamic"
export const maxDuration = 60

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

  const settings = await db
    .select({
      userId: reminderSettings.userId,
      email: users.email,
      timezone: reminderSettings.timezone,
      times: reminderSettings.times,
    })
    .from(reminderSettings)
    .innerJoin(users, eq(reminderSettings.userId, users.id))
    .where(eq(reminderSettings.emailEnabled, true))

  const matching = settings.filter((s) => {
    try {
      const times: string[] = JSON.parse(s.times)
      // ponytail: use user's timezone, not server UTC
      const currentTime = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: s.timezone || "UTC",
      }).format(new Date())
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

  // ponytail: send in parallel batches of 5 to avoid maxDuration timeout
  const results: { email: string; status: string }[] = []
  for (let i = 0; i < matching.length; i += 5) {
    const batch = matching.slice(i, i + 5)
    const batchResults = await Promise.all(
      batch.map(async (s) => {
        if (!s.email) return null
        const ok = await sendReminder(s.email, REMINDER_FROM, transporter)
        return { email: s.email, status: ok ? "sent" : "failed" }
      })
    )
    for (const r of batchResults) {
      if (r) results.push(r)
    }
  }

  return NextResponse.json(
    { sent: results.filter((r) => r.status === "sent").length, results },
    { headers: { "Cache-Control": "no-store" } },
  )
}
