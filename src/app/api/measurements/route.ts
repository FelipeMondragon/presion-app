import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { measurements } from "@/db/schema"
import { eq, desc, and, gte, lte, count } from "drizzle-orm"
import crypto from "crypto"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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

  const data = await db
    .select()
    .from(measurements)
    .where(where)
    .orderBy(desc(measurements.measuredAt))
    .limit(limit ?? 999999)
    .offset(offset)

  if (isPaginationRequest) {
    const totalResult = await db
      .select({ count: count() })
      .from(measurements)
      .where(where)
    const total = totalResult[0]?.count ?? 0

    return NextResponse.json({ data: data.map(mapMeasurement), total })
  }

  return NextResponse.json(data.map(mapMeasurement))
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const id = crypto.randomUUID()

  await db.insert(measurements).values({
    id,
    userId: session.user.id,
    systolic: body.systolic,
    diastolic: body.diastolic,
    pulse: body.pulse ?? null,
    arm: body.arm ?? "left",
    position: body.position ?? "sitting",
    notes: body.notes ?? null,
    measuredAt: body.measured_at ?? new Date().toISOString(),
  })

  return NextResponse.json({ success: true, id })
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
