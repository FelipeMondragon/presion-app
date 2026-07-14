import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import nodemailer from "nodemailer"
import { createTransporter } from "@/lib/mail"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const doctorEmail = formData.get("email") as string | null
  const patientName = formData.get("patientName") as string | null

  if (!file || !doctorEmail) {
    return NextResponse.json({ error: "Missing file or email" }, { status: 400 })
  }

  const transporter = createTransporter()
  if (!transporter) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 500 })
  }

  const senderEmail = process.env.REMINDER_FROM || session.user.email
  const buffer = Buffer.from(await file.arrayBuffer())

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
      attachments: [{ filename: file.name, content: buffer }],
    })
    return NextResponse.json({ sent: true })
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
