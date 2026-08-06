import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import nodemailer from "nodemailer"
import { createTransporter } from "@/lib/mail"
import { checkRateLimit } from "@/lib/rate-limiter"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const patientNameSchema = z.string().max(100).refine((s) => !/[\r\n]/.test(s), { message: "Invalid name" })

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!checkRateLimit(`export-send:${session.user.id}`, 5, 600_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const doctorEmailRaw = formData.get("email") as string | null
  const patientNameRaw = formData.get("patientName") as string | null

  if (!file || !doctorEmailRaw) {
    return NextResponse.json({ error: "Missing file or email" }, { status: 400 })
  }

  const emailParsed = z.string().email().safeParse(doctorEmailRaw)
  if (!emailParsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }
  const doctorEmail = emailParsed.data

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 })
  }

  let patientName: string | null = null
  if (patientNameRaw) {
    const parsedName = patientNameSchema.safeParse(patientNameRaw)
    if (!parsedName.success) {
      return NextResponse.json({ error: "Invalid patient name" }, { status: 400 })
    }
    patientName = parsedName.data
  }

  const transporter = createTransporter()
  if (!transporter) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 500 })
  }

  const senderEmail = process.env.REMINDER_FROM || session.user.email
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `reporte-presion-${new Date().toISOString().slice(0, 10)}.pdf`

  try {
    await transporter.sendMail({
      from: senderEmail,
      to: doctorEmail,
      subject: `Reporte de presión arterial${patientName ? ` - ${patientName}` : ""}`,
      text: [
        "Hola,",
        "",
        `Adjunto encontrarás el reporte de presión arterial${patientName ? ` de ${patientName}` : ""}.`,
        "",
        "— Presión App",
      ].join("\n"),
      attachments: [{ filename, content: buffer }],
    })
    return NextResponse.json({ sent: true })
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
