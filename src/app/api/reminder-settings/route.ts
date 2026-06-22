import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { reminderSettings } from "@/db/schema"
import { eq } from "drizzle-orm"
import { reminderSettingsSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const [settings] = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, session.user.id))
    .limit(1)

  if (!settings) {
    return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } })
  }

  let times: string[]
  try {
    times = JSON.parse(settings.times)
  } catch {
    times = ["08:00", "20:00"]
  }

  return NextResponse.json(
    {
      user_id: settings.userId,
      times,
      email_enabled: settings.emailEnabled,
      browser_enabled: settings.browserEnabled,
      timezone: settings.timezone,
      updated_at: settings.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`reminder:${session.user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = reminderSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const { times, email_enabled, browser_enabled, timezone } = parsed.data
  const userId = session.user.id

  await db
    .insert(reminderSettings)
    .values({
      userId,
      times: JSON.stringify(times ?? ["08:00", "20:00"]),
      emailEnabled: email_enabled ?? true,
      browserEnabled: browser_enabled ?? true,
      timezone: timezone ?? "America/Chihuahua",
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: reminderSettings.userId,
      set: {
        times: JSON.stringify(times ?? ["08:00", "20:00"]),
        emailEnabled: email_enabled ?? true,
        browserEnabled: browser_enabled ?? true,
        timezone: timezone ?? "America/Chihuahua",
        updatedAt: new Date().toISOString(),
      },
    })

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
}
