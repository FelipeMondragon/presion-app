"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"
import { toast } from "sonner"
import type { Measurement } from "@/lib/types"
import { FileDown, FileSpreadsheet, FileText, Share2, Send, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { applyPlugin } from "jspdf-autotable"
applyPlugin(jsPDF)
import { formatDate, cn } from "@/lib/utils"
import { classifyBP, type BPClassification } from "@/lib/bp-classifier"

async function fetchData(dateFrom: string, dateTo: string, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (dateFrom) params.set("from", dateFrom)
  if (dateTo) params.set("to", dateTo)
  const res = await fetch(`/api/measurements?${params.toString()}`, { signal })
  if (!res.ok) return []
  return res.json()
}

function computeStats(data: Measurement[]) {
  const s = data.map((m) => m.systolic)
  const d = data.map((m) => m.diastolic)
  const p = data.map((m) => m.pulse).filter((v): v is number => v !== null)
  const avgS = Math.round(s.reduce((a, b) => a + b, 0) / s.length)
  const avgD = Math.round(d.reduce((a, b) => a + b, 0) / d.length)
  const avgP = p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : null
  const distribution: Record<BPClassification, number> = { normal: 0, elevada: 0, hipertensionGrado1: 0, hipertensionGrado2: 0, crisisHipertensiva: 0 }
  for (const m of data) distribution[classifyBP(m.systolic, m.diastolic).classification]++
  return { count: data.length, avgS, avgD, avgP, minS: Math.min(...s), maxS: Math.max(...s), minD: Math.min(...d), maxD: Math.max(...d), overall: classifyBP(avgS, avgD).classification, distribution }
}

function drawChart(doc: jsPDF, data: Measurement[], x: number, y: number, w: number, h: number, t: any, _lang: string) {
  const sorted = [...data].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
  const n = sorted.length
  if (n < 2) return

  const minY = 50, maxY = 210, yRange = maxY - minY
  const mapY = (v: number) => y + h - ((v - minY) / yRange) * h
  const mapX = (i: number) => x + (n > 1 ? (i / (n - 1)) * w : w / 2)

  doc.setFontSize(8)
  for (let v = 60; v <= 200; v += 20) {
    const ly = mapY(v)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(x, ly, x + w, ly)
    doc.setTextColor(160, 160, 160)
    doc.text(String(v), x - 4, ly + 2)
  }

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.6)
  doc.line(x, mapY(130), x + w, mapY(130))
  doc.line(x, mapY(80), x + w, mapY(80))

  const drawLine = (values: number[], r: number, g: number, b: number) => {
    doc.setDrawColor(r, g, b)
    doc.setLineWidth(2)
    for (let i = 1; i < n; i++) doc.line(mapX(i - 1), mapY(values[i - 1]), mapX(i), mapY(values[i]))
  }
  drawLine(sorted.map((m) => m.systolic), 220, 38, 38)
  drawLine(sorted.map((m) => m.diastolic), 37, 99, 235)

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  const step = n <= 10 ? 1 : n <= 20 ? 2 : Math.ceil(n / 6)
  for (let i = 0; i < n; i += step) {
    const d = new Date(sorted[i].measured_at)
    doc.text(`${d.getDate()}/${d.getMonth() + 1}`, mapX(i) - 3, y + h + 3)
  }

  doc.setFontSize(8)
  doc.setTextColor(220, 38, 38)
  doc.text("●", x + 5, y + h - 3)
  doc.text(t.registrar.sistolica, x + 10, y + h - 3)
  doc.setTextColor(37, 99, 235)
  doc.text("●", x + 50, y + h - 3)
  doc.text(t.registrar.diastolica, x + 55, y + h - 3)
}

async function generatePDF(data: Measurement[], patientName: string, dateFrom: string, dateTo: string, t: any, lang: string) {
  const doc = new jsPDF()
  const stats = computeStats(data)
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const m = 20
  const cw = pw - m * 2

  const colKey = (k: string) =>
    k === "normal" ? t.clasificacion.normal :
    k === "elevada" ? t.clasificacion.elevada :
    k === "hipertensionGrado1" ? t.clasificacion.hipertensionGrado1 :
    k === "hipertensionGrado2" ? t.clasificacion.hipertensionGrado2 :
    t.clasificacion.crisisHipertensiva

  const CLASS_COLORS: Record<string, [number, number, number]> = {
    normal: [22, 163, 74],
    elevada: [217, 119, 6],
    hipertensionGrado1: [234, 88, 12],
    hipertensionGrado2: [220, 38, 38],
    crisisHipertensiva: [153, 27, 27],
  }

  const c = CLASS_COLORS[stats.overall] || [100, 100, 100]

  // Header bar
  doc.setFillColor(200, 35, 35)
  doc.rect(0, 0, pw, 28, "F")
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.text(t.app.name, m, 16)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text(t.exportar.informeMedico, m, 24)

  let y = 36

  // Classification banner
  const bh = 11
  doc.setFillColor(c[0], c[1], c[2])
  doc.roundedRect(m, y, cw, bh, 2, 2, "F")
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.text(`${t.exportar.clasificacion}: ${colKey(stats.overall)}`, m + 6, y + 7)
  doc.setFont("helvetica", "normal")
  y += bh + 6

  // Patient info
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`${t.exportar.paciente}: ${patientName}`, m, y); y += 5
  if (dateFrom || dateTo) {
    const range = dateFrom && dateTo
      ? `${formatDate(dateFrom, lang, { dateStyle: "short" })} - ${formatDate(dateTo, lang, { dateStyle: "short" })}`
      : dateFrom || dateTo
    doc.text(`${t.exportar.periodo}: ${range}`, m, y); y += 5
  }
  doc.text(`${t.exportar.generadoEl}: ${formatDate(new Date(), lang, { dateStyle: "long" })}`, m, y); y += 8

  // Stats cards
  const cardW = (cw - 8) / 3
  const cardH = 20
  const cardY = y
  const cards = [
    { label: t.exportar.promedio, value: `${stats.avgS}/${stats.avgD}`, unit: t.dashboard.mmhg, color: c },
    { label: t.exportar.rango, value: `${stats.minS}-${stats.maxS} / ${stats.minD}-${stats.maxD}`, unit: t.dashboard.mmhg, color: [100, 100, 100] },
    { label: t.historial.pulso, value: stats.avgP?.toString() || "-", unit: t.dashboard.bpm, color: [37, 99, 235] },
  ]

  for (let i = 0; i < cards.length; i++) {
    const cx = m + i * (cardW + 4)
    const card = cards[i]
    doc.setFillColor(248, 248, 248)
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "F")
    doc.setFillColor(card.color[0], card.color[1], card.color[2])
    doc.rect(cx, cardY, cardW, 2.5, "F")
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(card.label, cx + cardW / 2, cardY + 5.5, { align: "center" })
    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "bold")
    const valW = doc.getTextWidth!(card.value)
    if (valW > cardW - 4) doc.setFontSize(10)
    doc.text(card.value, cx + cardW / 2, cardY + 13, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6)
    doc.setTextColor(140, 140, 140)
    doc.text(card.unit, cx + cardW / 2, cardY + 17.5, { align: "center" })
  }
  y = cardY + cardH + 8

  // Distribution bar
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.setFont("helvetica", "bold")
  doc.text(t.exportar.distribucion, m, y); y += 4.5
  doc.setFont("helvetica", "normal")

  const barY = y
  const barH = 5
  const distKeys: BPClassification[] = ["normal", "elevada", "hipertensionGrado1", "hipertensionGrado2", "crisisHipertensiva"]
  let xOff = m
  const segs: { key: BPClassification; w: number }[] = []
  for (const k of distKeys) {
    const pct = stats.distribution[k] / stats.count
    const sw = pct * cw
    if (sw >= 0.5) segs.push({ key: k, w: sw })
  }
  for (const seg of segs) {
    const clr = CLASS_COLORS[seg.key]
    doc.setFillColor(clr[0], clr[1], clr[2])
    doc.rect(xOff, barY, seg.w, barH, "F")
    xOff += seg.w
  }
  y = barY + barH + 3

  doc.setFontSize(6)
  doc.setTextColor(100, 100, 100)
  xOff = m
  for (const seg of segs) {
    if (seg.w > 12) doc.text(colKey(seg.key), xOff + 1, y)
    doc.text(`${Math.round((stats.distribution[seg.key] / stats.count) * 100)}%`, xOff + 1, y + 3.5)
    xOff += seg.w
  }
  y += 8

  // Chart
  if (data.length >= 2) {
    if (y + 75 > ph - 20) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.setFont("helvetica", "bold")
    doc.text(t.exportar.evolucion, m, y); y += 4
    doc.setFont("helvetica", "normal")
    drawChart(doc, data, m, y, cw, 60, t, lang)
    y += 68
  }

  // Data table
  if (y > ph - 30) { doc.addPage(); y = 20 }
  const rows = data.map((m: Measurement) => [
    formatDate(m.measured_at, lang, { dateStyle: "short" }),
    String(m.systolic),
    String(m.diastolic),
    m.pulse?.toString() || "-",
    m.arm === "left" ? t.brazo.left : t.brazo.right,
    m.position === "sitting" ? t.posicion.sitting : m.position === "lying" ? t.posicion.lying : t.posicion.standing,
    m.notes || "",
  ])
  doc.autoTable({
    startY: y,
    head: [[t.historial.fecha, t.historial.sistolica, t.historial.diastolica, t.historial.pulso, t.historial.brazo, t.historial.posicion, "Notas"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 1.5 },
    headStyles: { fillColor: [200, 35, 35], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    pageBreak: "auto",
    repeatHeader: true,
  })

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.setFont("helvetica", "normal")
    const footerY = ph - 10
    const pageLabel = lang === "en" ? `Page ${i} of ${totalPages}` : `Página ${i} de ${totalPages}`
    doc.text(pageLabel, pw - m, footerY, { align: "right" })
    doc.text(t.exportar.disclaimer, m, footerY)
  }

  return doc
}

async function generateExcel(data: Measurement[], patientName: string, dateFrom: string, dateTo: string, t: any, lang: string) {
  const stats = computeStats(data)
  const colKey = (k: string) => k === "normal" ? t.clasificacion.normal : k === "elevada" ? t.clasificacion.elevada : k === "hipertensionGrado1" ? t.clasificacion.hipertensionGrado1 : k === "hipertensionGrado2" ? t.clasificacion.hipertensionGrado2 : t.clasificacion.crisisHipertensiva

  // ponytail: summary as a vertical key-value array for readability
  const summaryRows: any[][] = [
    [t.exportar.reportTitle, ""],
    [t.exportar.paciente, patientName],
    [t.exportar.generadoEl, formatDate(new Date(), lang, { dateStyle: "long" })],
    [t.exportar.totalMediciones, stats.count],
    [`${t.exportar.promedio} (${t.dashboard.mmhg})`, `${stats.avgS}/${stats.avgD}`],
    [`${t.exportar.minimo} (${t.dashboard.mmhg})`, `${stats.minS}/${stats.minD}`],
    [`${t.exportar.maximo} (${t.dashboard.mmhg})`, `${stats.maxS}/${stats.maxD}`],
    [`${t.historial.pulso} (${t.dashboard.bpm})`, stats.avgP ?? "-"],
    [t.exportar.clasificacionGeneral, colKey(stats.overall)],
    [],
    [t.exportar.distribucion, ""],
  ]
  const distKeys = Object.keys(stats.distribution) as BPClassification[]
  for (const k of distKeys) {
    const pct = Math.round((stats.distribution[k] / stats.count) * 100)
    summaryRows.push([colKey(k), `${stats.distribution[k]} (${pct}%)`])
  }

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
  ws1["!cols"] = [{ wch: 35 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws1, t.exportar.hojaResumen)

  const dataRows = data.map((m: Measurement) => ({
    [t.historial.fecha]: formatDate(m.measured_at, lang, { dateStyle: "short" }),
    [t.historial.sistolica + " (mmHg)"]: m.systolic,
    [t.historial.diastolica + " (mmHg)"]: m.diastolic,
    [t.historial.pulso + " (bpm)"]: m.pulse || "",
    [t.historial.brazo]: m.arm === "left" ? t.brazo.left : t.brazo.right,
    [t.historial.posicion]: m.position === "sitting" ? t.posicion.sitting : m.position === "lying" ? t.posicion.lying : t.posicion.standing,
    "Notas": m.notes || "",
  }))
  const ws2 = XLSX.utils.json_to_sheet(dataRows)
  XLSX.utils.book_append_sheet(wb, ws2, t.exportar.hojaMediciones)

  return wb
}

async function fileToBlob(input: jsPDF | XLSX.WorkBook, format: string): Promise<{ blob: Blob; name: string }> {
  const now = new Date().toISOString().slice(0, 10)
  if (format === "pdf") {
    const pdf = input as jsPDF
    return { blob: pdf.output("blob"), name: `presion-${now}.pdf` }
  }
  const wb = input as XLSX.WorkBook
  const data = XLSX.write(wb, { type: "array", bookType: "xlsx" })
  return { blob: new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name: `presion-${now}.xlsx` }
}

export default function ExportarPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.role === "admin") {
      router.replace(`/${lang}/panel`)
    }
  }, [session, router, lang])

  const [format, setFormat] = useState<string>("pdf")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [doctorEmail, setDoctorEmail] = useState("")

  async function getData() {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    try {
      const data = await fetchData(dateFrom, dateTo, ctrl.signal)
      if (data.length === 0) {
        toast.error(t.exportar.sinDatos)
        return null
      }
      return data
    } catch {
      toast.error(t.auth.errorConexion)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  async function handleDownload() {
    setLoading("download")
    const data = await getData()
    if (!data) { setLoading(null); return }
    try {
      const patientName = session?.user?.name || session?.user?.email || ""
      if (format === "pdf") {
        const doc = await generatePDF(data, patientName, dateFrom, dateTo, t, lang)
        doc.save(`presion-${new Date().toISOString().slice(0, 10)}.pdf`)
        toast.success(t.exportar.exitoPDF)
      } else {
        const wb = await generateExcel(data, patientName, dateFrom, dateTo, t, lang)
        XLSX.writeFile(wb, `presion-${new Date().toISOString().slice(0, 10)}.xlsx`)
        toast.success(t.exportar.exitoExcel)
      }
    } catch { toast.error(t.exportar.error) }
    finally { setLoading(null) }
  }

  async function handleShare() {
    setLoading("share")
    const data = await getData()
    if (!data) { setLoading(null); return }
    try {
      const patientName = session?.user?.name || session?.user?.email || ""
      let output: jsPDF | XLSX.WorkBook
      if (format === "pdf") output = await generatePDF(data, patientName, dateFrom, dateTo, t, lang)
      else output = await generateExcel(data, patientName, dateFrom, dateTo, t, lang)
      const { blob, name } = await fileToBlob(output, format)
      const file = new File([blob], name, { type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t.exportar.reportTitle })
      } else {
        // ponytail: fallback to download when Web Share with files is not supported
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = name; a.click()
        URL.revokeObjectURL(url)
      }
      toast.success(t.exportar.exitoCompartir)
    } catch {
      if ((navigator as any).share?.name !== "AbortError") toast.error(t.exportar.error)
    } finally { setLoading(null) }
  }

  async function handleSendEmail() {
    if (!doctorEmail || !doctorEmail.includes("@")) {
      toast.error(t.auth.correoInvalido)
      return
    }
    setLoading("email")
    const data = await getData()
    if (!data) { setLoading(null); return }
    try {
      const patientName = session?.user?.name || session?.user?.email || ""
      let output: jsPDF | XLSX.WorkBook
      if (format === "pdf") output = await generatePDF(data, patientName, dateFrom, dateTo, t, lang)
      else output = await generateExcel(data, patientName, dateFrom, dateTo, t, lang)
      const { blob, name } = await fileToBlob(output, format)

      const formData = new FormData()
      formData.append("file", blob, name)
      formData.append("email", doctorEmail)
      formData.append("patientName", patientName)

      const res = await fetch("/api/export/send", { method: "POST", body: formData })
      if (!res.ok) throw new Error()
      toast.success(t.exportar.exitoEnviar)
    } catch { toast.error(t.exportar.errorEnviar) }
    finally { setLoading(null) }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.exportar.titulo}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.exportar.reportTitle}
        </p>
      </div>

      <GlassCard className="p-4 sm:p-6" variant="elevated">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t.exportar.formato}
            </Label>
            <div
              role="radiogroup"
              aria-label={t.exportar.formato}
              className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800/70"
            >
              <button
                type="button"
                role="radio"
                aria-checked={format === "pdf"}
                onClick={() => setFormat("pdf")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors",
                  format === "pdf"
                    ? "bg-white text-red-600 shadow-sm dark:bg-gray-900 dark:text-red-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                <FileText className="h-4 w-4" />
                {t.exportar.pdf}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={format === "excel"}
                onClick={() => setFormat("excel")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors",
                  format === "excel"
                    ? "bg-white text-red-600 shadow-sm dark:bg-gray-900 dark:text-red-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t.exportar.excel}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.exportar.periodo}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dateFrom" className="text-xs text-gray-400 dark:text-gray-500">
                  {t.exportar.desde}
                </Label>
                <Input
                  id="dateFrom" type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-11 glass-subtle border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateTo" className="text-xs text-gray-400 dark:text-gray-500">
                  {t.exportar.hasta}
                </Label>
                <Input
                  id="dateTo" type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-11 glass-subtle border-gray-200 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctorEmail" className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t.exportar.enviarMedico}
            </Label>
            <Input
              id="doctorEmail" type="email" placeholder={t.exportar.emailMedicoPlaceholder}
              value={doctorEmail}
              onChange={(e) => setDoctorEmail(e.target.value)}
              className="glass-subtle border-gray-200 dark:border-gray-600"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="gradient" className="w-full min-h-12 px-4 sm:h-11 rounded-2xl text-base sm:text-sm" disabled={!!loading} onClick={handleDownload}>
              {loading === "download" ? <Loader2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4 animate-spin" /> : <FileDown className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />}
              {loading === "download" ? t.exportar.generando : t.exportar.descargar}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-2xl text-base sm:text-sm" disabled={!!loading} onClick={handleShare}>
              {loading === "share" ? <Loader2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4 animate-spin" /> : <Share2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />}
              {loading === "share" ? t.exportar.generando : t.exportar.compartir}
            </Button>
            <Button variant="secondary" className="h-12 rounded-2xl text-base sm:text-sm" disabled={!!loading} onClick={handleSendEmail}>
              {loading === "email" ? <Loader2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4 animate-spin" /> : <Send className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />}
              {loading === "email" ? t.exportar.enviando : t.exportar.enviarMedico}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
