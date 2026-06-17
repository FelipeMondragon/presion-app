import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq, or } from "drizzle-orm"

export async function POST(request: Request) {
  const { email, password, name, username, securityQuestion, securityAnswer } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
  }

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

  return NextResponse.json({ success: true })
}
