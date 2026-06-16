import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { measurements } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  await db
    .delete(measurements)
    .where(
      and(eq(measurements.id, id), eq(measurements.userId, session.user.id))
    )

  return NextResponse.json({ success: true })
}
