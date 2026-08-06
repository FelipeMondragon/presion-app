import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq, or } from "drizzle-orm"
import { signupApiSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"
import { getClientIp } from "@/lib/ip"

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (!checkRateLimit(`signup:${ip}`, 3, 600_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = signupApiSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ error: `${issue.path.join(".")}: ${issue.message}` }, { status: 400 })
  }

  const { email, password, name, username, securityQuestion, securityAnswer } = parsed.data

  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1)

  // ponytail: generic message to prevent email/username enumeration
  if (existing) {
    return NextResponse.json({ error: "Correo o usuario ya registrado" }, { status: 400 })
  }

  const passwordHash = await hash(password, 12)
  // ponytail: normalise so "Firulais" == "firulais" on recovery
  const securityAnswerHash = await hash((securityAnswer || "").trim().toLowerCase(), 12)
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
