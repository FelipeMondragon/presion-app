import { NextResponse } from "next/server"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 })
  }

  const [user] = await db
    .select({
      securityQuestion: users.securityQuestion,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user || !user.securityQuestion) {
    return NextResponse.json({ error: "No encontramos una cuenta con ese correo" }, { status: 404 })
  }

  return NextResponse.json({ question: user.securityQuestion })
}
