"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { getTranslations, type Translations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"
import { toast } from "sonner"
import type { Measurement } from "@/lib/types"
import { FileDown, FileSpreadsheet, FileText, Share2, Send, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import type jsPDF from "jspdf"
import { formatDate, cn } from "@/lib/utils"
import type { BPClassification } from "@/lib/bp-classifier"
import { generatePDF, computeStats } from "@/lib/pdf-report"

async function fetchData(dateFrom: string, dateTo: string, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (dateFrom) params.set("from", new Date(`${dateFrom}T00:00:00`).toISOString())
  if (dateTo) params.set("to", new Date(`${dateTo}T23:59:59.999`).toISOString())
  params.set("limit", "1000")
  const all: Measurement[] = []
  for (;;) {
    params.set("offset", String(all.length))
    const res = await fetch(`/api/measurements?${params.toString()}`, { signal })
    if (!res.ok) return []
    const { data, total } = await res.json()
    all.push(...data)
    if (data.length === 0 || all.length >= total) return all
  }
}

async function generateExcel(data: Measurement[], patientName: string, dateFrom: string, dateTo: string, t: Translations, lang: string) {
  const stats = computeStats(data)
  const colKey = (k: string) => k === "normal" ? t.clasificacion.normal : k === "elevada" ? t.clasificacion.elevada : k === "hipertensionGrado1" ? t.clasificacion.hipertensionGrado1 : k === "hipertensionGrado2" ? t.clasificacion.hipertensionGrado2 : t.clasificacion.crisisHipertensiva

  // ponytail: summary as a vertical key-value array for readability
  const summaryRows: (string | number)[][] = [
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
  const [firstDate, setFirstDate] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [doctorEmail, setDoctorEmail] = useState("")

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    fetch("/api/measurements?limit=1&order=asc")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const measuredAt = json?.data?.[0]?.measured_at
        if (cancelled || !measuredAt) return
        const d = new Date(measuredAt)
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        setFirstDate(local)
        setDateFrom(local)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session?.user?.id])

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
        const doc = generatePDF(data, patientName, dateFrom, dateTo, t, lang)
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
      if (format === "pdf") output = generatePDF(data, patientName, dateFrom, dateTo, t, lang)
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
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error(t.exportar.error)
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
      if (format === "pdf") output = generatePDF(data, patientName, dateFrom, dateTo, t, lang)
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
                  min={firstDate || undefined}
                  onChange={(e) => {
                    const v = e.target.value
                    setDateFrom(firstDate && v && v < firstDate ? firstDate : v)
                  }}
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
