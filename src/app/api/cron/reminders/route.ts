import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  const { data: settings } = await supabase
    .from("reminder_settings")
    .select("*, auth.users!inner(email)")
    .contains("times", [currentTime])
    .eq("email_enabled", true)

  if (!settings || settings.length === 0) {
    return NextResponse.json({ sent: 0, message: "No reminders for this time" })
  }

  const results = []
  type ReminderSetting = {
    user_id: string
    users: { email: string } | null
  }

  for (const setting of settings as unknown as ReminderSetting[]) {
    try {
      const userEmail = setting.users?.email
      if (!userEmail || !process.env.REMINDER_FROM) continue

      // TODO: Implement email sending via Gmail SMTP
      // This requires nodemailer or similar
      results.push({ email: userEmail, status: "pending" })
    } catch (error) {
      results.push({ email: (setting as unknown as ReminderSetting).users?.email, error: String(error) })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}
