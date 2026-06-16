import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { reminderSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

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
    return NextResponse.json(null)
  }

  return NextResponse.json({
    user_id: settings.userId,
    times: JSON.parse(settings.times),
    email_enabled: settings.emailEnabled,
    browser_enabled: settings.browserEnabled,
    timezone: settings.timezone,
    updated_at: settings.updatedAt,
  })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const userId = session.user.id

  await db
    .insert(reminderSettings)
    .values({
      userId,
      times: JSON.stringify(body.times ?? ["08:00", "20:00"]),
      emailEnabled: body.email_enabled ?? true,
      browserEnabled: body.browser_enabled ?? true,
      timezone: body.timezone ?? "America/Chihuahua",
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: reminderSettings.userId,
      set: {
        times: JSON.stringify(body.times ?? ["08:00", "20:00"]),
        emailEnabled: body.email_enabled ?? true,
        browserEnabled: body.browser_enabled ?? true,
        timezone: body.timezone ?? "America/Chihuahua",
        updatedAt: new Date().toISOString(),
      },
    })

  return NextResponse.json({ success: true })
}
