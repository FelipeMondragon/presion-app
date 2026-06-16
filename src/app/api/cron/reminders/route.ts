import { NextResponse } from "next/server"
import { db } from "@/db/client"
import { reminderSettings, users } from "@/db/schema"
import { eq, like } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const maxDuration = 60

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
    return NextResponse.json({ sent: 0, message: "No reminders for this time" })
  }

  const results = []
  for (const setting of matching) {
    try {
      if (!setting.email || !process.env.REMINDER_FROM) continue

      // TODO: Implement email sending via Gmail SMTP
      results.push({ email: setting.email, status: "pending" })
    } catch (error) {
      results.push({ email: setting.email, error: String(error) })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}
