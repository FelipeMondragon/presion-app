"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"
import { LabeledSelect } from "@/components/labeled-select"
import { toast } from "sonner"
import type { Measurement } from "@/lib/types"
import { FileDown, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { formatDate } from "@/lib/utils"

async function fetchData(dateFrom: string, dateTo: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from("measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("measured_at", { ascending: true })

  if (dateFrom) query = query.gte("measured_at", new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    query = query.lte("measured_at", end.toISOString())
  }

  const { data } = await query
  return data || []
}

export default function ExportarPage() {
  const params = useParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [format, setFormat] = useState<string>("pdf")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(false)

  const exportToPDF = async () => {
    setLoading(true)
    const data = await fetchData(dateFrom, dateTo)
    if (data.length === 0) {
      toast.error("No hay datos para exportar")
      setLoading(false)
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(220, 38, 38)
    doc.text("Presión App", 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Exportado: ${formatDate(new Date(), lang, { dateStyle: "long" })}`,
      14,
      28
    )

    const rows = data.map((m: Measurement) => [
      formatDate(m.measured_at, lang),
      m.systolic.toString(),
      m.diastolic.toString(),
      m.pulse?.toString() || "-",
      m.arm === "left" ? "Izq" : "Der",
      m.position === "sitting" ? "Sentado" : m.position === "lying" ? "Acostado" : "De pie",
      m.notes || "",
    ])

    doc.autoTable({
      startY: 35,
      head: [
        [
          "Fecha",
          "Sistólica",
          "Diastólica",
          "Pulso",
          "Brazo",
          "Posición",
          "Notas",
        ],
      ],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
    })

    // Add summary
    const systolicArray = data.map((m: Measurement) => m.systolic)
    const diastolicArray = data.map((m: Measurement) => m.diastolic)
    const avgSystolic = Math.round(
      systolicArray.reduce((a: number, b: number) => a + b, 0) /
        systolicArray.length
    )
    const avgDiastolic = Math.round(
      diastolicArray.reduce((a: number, b: number) => a + b, 0) /
        diastolicArray.length
    )

    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(
      `Promedio: ${avgSystolic}/${avgDiastolic} mmHg - ${data.length} registros`,
      14,
      doc.lastAutoTable.finalY + 15
    )

    doc.save(`presion-${new Date().toISOString().slice(0, 10)}.pdf`)
    setLoading(false)
    toast.success("PDF exportado correctamente")
  }

  const exportToExcel = async () => {
    setLoading(true)
    const data = await fetchData(dateFrom, dateTo)
    if (data.length === 0) {
      toast.error("No hay datos para exportar")
      setLoading(false)
      return
    }

    const rows = data.map((m: Measurement) => ({
      Fecha: `${new Date(m.measured_at).toISOString().slice(0, 10)} ${new Date(m.measured_at).toTimeString().slice(0, 5)}`,
      Sistólica: m.systolic,
      Diastólica: m.diastolic,
      Pulso: m.pulse || "",
      Brazo: m.arm === "left" ? "Izquierdo" : "Derecho",
      Posición:
        m.position === "sitting"
          ? "Sentado"
          : m.position === "lying"
          ? "Acostado"
          : "De pie",
      Notas: m.notes || "",
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Mediciones")
    XLSX.writeFile(wb, `presion-${new Date().toISOString().slice(0, 10)}.xlsx`)
    setLoading(false)
    toast.success("Excel exportado correctamente")
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t.exportar.titulo}
      </h1>

      <GlassCard className="p-6" variant="elevated">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {t.exportar.formato}
        </h2>
        <div className="space-y-4">
          <LabeledSelect
            value={format}
            onValueChange={setFormat}
            label={t.exportar.formato}
            options={[
              { value: "pdf", label: t.exportar.pdf },
              { value: "excel", label: t.exportar.excel },
            ]}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-sm text-gray-500 dark:text-gray-400">
                {t.exportar.desde}
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="glass-subtle border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-sm text-gray-500 dark:text-gray-400">
                {t.exportar.hasta}
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="glass-subtle border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>

          <Button
            className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 border-0"
            disabled={loading}
            onClick={format === "pdf" ? exportToPDF : exportToExcel}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.exportar.generando}
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                {t.exportar.exportar} {format === "pdf" ? "PDF" : "Excel"}
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
