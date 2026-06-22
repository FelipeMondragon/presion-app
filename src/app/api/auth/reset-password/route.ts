import { NextResponse } from "next/server"
import { hash, compare } from "bcryptjs"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { resetApiSchema, resetPasswordSchema, verifyAnswerSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"

const GENERIC_ERROR = "Correo o respuesta inválidos"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`reset-pw:${ip}`, 5, 600_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const hasPassword = typeof body === "object" && body !== null && "newPassword" in body
  const parsed = hasPassword ? resetApiSchema.safeParse(body) : verifyAnswerSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ error: `${issue.path.join(".")}: ${issue.message}` }, { status: 400 })
  }

  const { email, answer, newPassword } = parsed.data as { email: string; answer: string; newPassword?: string }

  const [user] = await db
    .select({ id: users.id, securityAnswer: users.securityAnswer })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }

  const isValid = await compare(answer, user.securityAnswer)
  if (!isValid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }

  // Step 2 — verify only
  if (!newPassword) {
    return NextResponse.json({ verified: true }, { headers: { "Cache-Control": "no-store" } })
  }

  const passwordHash = await hash(newPassword, 10)

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id))

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
}
