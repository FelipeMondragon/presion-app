import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { hash, compare } from "bcryptjs"
import { updateUserSchema, changePasswordSchema } from "@/lib/validators"

export const dynamic = "force-dynamic"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const isAdmin = session.user.role === "admin"
  const isOwn = session.user.id === id

  if (!isAdmin && !isOwn) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  // Profile update (name only) for own user
  const b = body as Record<string, unknown>
  if (isOwn && !isAdmin && !b.password && !b.role && !b.email && !b.username) {
    const parsed = updateUserSchema.pick({ name: true }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
    }
    await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, id))
    return NextResponse.json({ success: true })
  }

  // Password change for own user
  if (isOwn && b.currentPassword && b.newPassword) {
    const parsed = changePasswordSchema.safeParse(b)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
    }

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const valid = await compare(parsed.data.currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
    }

    const passwordHash = await hash(parsed.data.newPassword, 10)
    await db.update(users).set({ passwordHash }).where(eq(users.id, id))
    return NextResponse.json({ success: true })
  }

  // Admin update
  if (isAdmin) {
    const { adminPassword, newPassword: pw, confirmPassword: cpw, ...rest } = b as Record<string, unknown>

    if (!adminPassword || typeof adminPassword !== "string") {
      return NextResponse.json({ error: "Contraseña de administrador requerida" }, { status: 400 })
    }

    const [adminUser] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
    if (!adminUser) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 })
    }

    const valid = await compare(adminPassword, adminUser.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Contraseña de administrador incorrecta" }, { status: 400 })
    }

    const parsed = updateUserSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
    }

    const updates: Record<string, string | null> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.username !== undefined) updates.username = parsed.data.username
    if (parsed.data.email !== undefined) updates.email = parsed.data.email
    if (parsed.data.role !== undefined) updates.role = parsed.data.role

    if (pw) {
      if (pw !== cpw) {
        return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 })
      }
      if (typeof pw !== "string" || pw.length < 6) {
        return NextResponse.json({ error: "Mínimo 6 caracteres" }, { status: 400 })
      }
      updates.passwordHash = await hash(pw, 10)
    }

    await db.update(users).set(updates).where(eq(users.id, id))
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 })
  }

  await db.delete(users).where(eq(users.id, id))

  return NextResponse.json({ success: true })
}
