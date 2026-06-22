import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { measurements } from "@/db/schema"
import { eq, desc, and, gte, lte, count } from "drizzle-orm"
import crypto from "crypto"
import { measurementSchema } from "@/lib/validators"
import { checkRateLimit } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`measurements:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("from")
  const dateTo = searchParams.get("to")
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const limit = limitParam ? parseInt(limitParam, 10) : null
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  const conditions = [eq(measurements.userId, session.user.id)]
  const isPaginationRequest = limit !== null

  if (dateFrom) {
    conditions.push(gte(measurements.measuredAt, new Date(dateFrom).toISOString()))
  }
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    conditions.push(lte(measurements.measuredAt, end.toISOString()))
  }

  const where = and(...conditions)
  const limitValue = limit ?? 1000

  const data = await db
    .select()
    .from(measurements)
    .where(where)
    .orderBy(desc(measurements.measuredAt))
    .limit(limitValue)
    .offset(offset)

  if (isPaginationRequest) {
    const totalResult = await db
      .select({ count: count() })
      .from(measurements)
      .where(where)
    const total = totalResult[0]?.count ?? 0

    return NextResponse.json({ data: data.map(mapMeasurement), total }, { headers: { "Cache-Control": "private, no-cache" } })
  }

  return NextResponse.json(data.map(mapMeasurement), { headers: { "Cache-Control": "private, no-cache" } })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(`measurements:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = measurementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const data = parsed.data

  await db.insert(measurements).values({
    id,
    userId: session.user.id,
    systolic: data.systolic,
    diastolic: data.diastolic,
    pulse: data.pulse ?? null,
    arm: data.arm ?? "left",
    position: data.position ?? "sitting",
    notes: data.notes ?? null,
    measuredAt: data.measured_at ?? new Date().toISOString(),
  })

  return NextResponse.json({ success: true, id }, { headers: { "Cache-Control": "no-store" } })
}

function mapMeasurement(m: typeof measurements.$inferSelect) {
  return {
    id: m.id,
    user_id: m.userId,
    systolic: m.systolic,
    diastolic: m.diastolic,
    pulse: m.pulse,
    arm: m.arm,
    position: m.position,
    notes: m.notes,
    measured_at: m.measuredAt,
    created_at: m.createdAt,
  }
}
