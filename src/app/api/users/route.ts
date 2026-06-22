import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { createUserSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const data = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`users:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const { email, password, name, username, role } = parsed.data

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

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name: name || null,
    username: username || null,
    role,
  })

  return NextResponse.json({ success: true, id })
}
