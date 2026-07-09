import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/client"
import { measurements } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { checkRateLimit } from "@/lib/rate-limiter"
import { getClientIp } from "@/lib/ip"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const ip = getClientIp(request)
  if (!checkRateLimit(`delete-measurement:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  const { id } = await params

  const result = await db
    .delete(measurements)
    .where(
      and(eq(measurements.id, id), eq(measurements.userId, session.user.id))
    )
    .returning({ id: measurements.id })

  if (result.length === 0) {
    return NextResponse.json({ error: "Medición no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
}
