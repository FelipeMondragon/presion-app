import { NextResponse } from "next/server"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { forgotPasswordSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`forgot-pw:${ip}`, 3, 600_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const { email } = parsed.data

  const [user] = await db
    .select({ securityQuestion: users.securityQuestion })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // ponytail: always return 200 + a question so attackers can't enumerate accounts
  return NextResponse.json(
    { question: user?.securityQuestion ?? "mascota" },
    { headers: { "Cache-Control": "no-store" } },
  )
}
