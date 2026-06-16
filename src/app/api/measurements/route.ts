import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { measurements } from "@/db/schema"
import { eq, desc, and, gte, lte } from "drizzle-orm"
import crypto from "crypto"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("from")
  const dateTo = searchParams.get("to")

  let query = db
    .select()
    .from(measurements)
    .where(eq(measurements.userId, session.user.id))
    .orderBy(desc(measurements.measuredAt))

  if (dateFrom) {
    const fromDate = new Date(dateFrom).toISOString()
    query = db
      .select()
      .from(measurements)
      .where(
        and(
          eq(measurements.userId, session.user.id),
          gte(measurements.measuredAt, fromDate)
        )
      )
      .orderBy(desc(measurements.measuredAt))

    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      query = db
        .select()
        .from(measurements)
        .where(
          and(
            eq(measurements.userId, session.user.id),
            gte(measurements.measuredAt, fromDate),
            lte(measurements.measuredAt, end.toISOString())
          )
        )
        .orderBy(desc(measurements.measuredAt))
    }
  }

  const data = await query
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
