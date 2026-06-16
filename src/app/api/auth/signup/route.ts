import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 })
  }

  const passwordHash = await hash(password, 10)
  const id = crypto.randomUUID()

  await db.insert(users).values({ id, email, passwordHash })

  return NextResponse.json({ success: true })
}
