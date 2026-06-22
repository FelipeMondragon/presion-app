import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { measurements, users } from "@/db/schema"
import { eq, desc, and, gte, lte, count } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("from")
  const dateTo = searchParams.get("to")

  const conditions = []

  if (dateFrom) {
    conditions.push(gte(measurements.measuredAt, new Date(dateFrom).toISOString()))
  }
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    conditions.push(lte(measurements.measuredAt, end.toISOString()))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select({
      id: measurements.id,
      userId: measurements.userId,
      systolic: measurements.systolic,
      diastolic: measurements.diastolic,
      pulse: measurements.pulse,
      arm: measurements.arm,
      position: measurements.position,
      notes: measurements.notes,
      measuredAt: measurements.measuredAt,
      createdAt: measurements.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(measurements)
    .innerJoin(users, eq(measurements.userId, users.id))
    .where(where)
    .orderBy(desc(measurements.measuredAt))

  const totalResult = await db
    .select({ count: count() })
    .from(measurements)

  const total = totalResult[0]?.count ?? 0

  return NextResponse.json({
    data,
    total,
    users: await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users),
  })
}
