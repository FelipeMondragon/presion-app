import { NextResponse } from "next/server"
import { hash, compare } from "bcryptjs"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const { email, answer, newPassword, confirmPassword } = await request.json()

  if (!email || !answer) {
    return NextResponse.json({ error: "Email y respuesta requeridos" }, { status: 400 })
  }

  const [user] = await db
    .select({
      id: users.id,
      securityAnswer: users.securityAnswer,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const isValid = await compare(answer, user.securityAnswer)

  if (!isValid) {
    return NextResponse.json({ error: "Respuesta incorrecta" }, { status: 400 })
  }

  // Step 2 verification only — no new password provided
  if (!newPassword) {
    return NextResponse.json({ verified: true })
  }

  // Step 3 — actually reset password
  if (!confirmPassword || newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Mínimo 6 caracteres" }, { status: 400 })
  }

  const passwordHash = await hash(newPassword, 10)

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id))

  return NextResponse.json({ success: true })
}
