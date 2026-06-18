import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq, or } from "drizzle-orm"
import { signupSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`signup:${ip}`, 3, 600_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const { email, password, name, username, securityQuestion, securityAnswer } = parsed.data

  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1)

  if (existing) {
    if (existing.email === email) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 })
    }
    return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 })
  }

  const passwordHash = await hash(password, 10)
  const securityAnswerHash = await hash(securityAnswer || "", 10)
  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name: name || null,
    username: username || null,
    securityQuestion: securityQuestion || "",
    securityAnswer: securityAnswerHash,
  })

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
}
