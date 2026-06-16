"use client"

import { useEffect, useState, useDeferredValue, useMemo } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Trash2, Loader2, BarChart3, List } from "lucide-react"
import { LabeledSelect } from "@/components/labeled-select"
import { formatDate, formatDateShort } from "@/lib/utils"
import type { Measurement } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function HistorialPage() {
  const params = useParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()

  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const deferredFilter = useDeferredValue(filter)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [view, setView] = useState<"chart" | "list">("chart")

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!session?.user?.id) return
      setLoading(true)

      const res = await fetch("/api/measurements")
      const data = await res.json()

      if (!cancelled && Array.isArray(data)) setMeasurements(data)
      if (!cancelled) setLoading(false)
    }

    loadData()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const filteredMeasurements = useMemo(() => {
    const now = new Date()
    let start: Date | null = null

    if (deferredFilter === "week") {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      start = d
    } else if (deferredFilter === "month") {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      start = d
    } else if (deferredFilter === "year") {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() - 1)
      start = d
    }

    if (start) {
      return measurements.filter((m) => new Date(m.measured_at) >= start)
    }
    return measurements
  }, [measurements, deferredFilter])

  const handleDelete = async (id: string) => {
    if (!confirm(t.historial.eliminarConfirmacion)) return
    setDeleting(id)
    await fetch(`/api/measurements/${id}`, { method: "DELETE" })
    setMeasurements((prev) => prev.filter((m) => m.id !== id))
    setDeleting(null)
  }

  const bpCache = useMemo(() => {
    const cache: Record<string, ReturnType<typeof classifyBP>> = {}
    filteredMeasurements.forEach((m) => {
      cache[m.id] = classifyBP(m.systolic, m.diastolic)
    })
    return cache
  }, [filteredMeasurements])

  const chartData = [...filteredMeasurements]
    .reverse()
    .map((m) => ({
      date: formatDateShort(m.measured_at, lang),
      sistolica: m.systolic,
      diastolica: m.diastolic,
      pulso: m.pulse,
    }))

  return (
    <div className="space-y-6">
      {/* Header + filtros */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.historial.titulo}
        </h1>
        <div className="w-40">
          <LabeledSelect
            value={filter}
            onValueChange={setFilter}
            label=""
            options={[
              { value: "all", label: "Todo" },
              { value: "week", label: t.historial.filtroSemana },
              { value: "month", label: t.historial.filtroMes },
              { value: "year", label: t.historial.filtroAno },
            ]}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 glass-subtle w-fit">
        <button
          onClick={() => setView("chart")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            view === "chart"
              ? "bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          {t.historial.graficoSistolica.replace(" sistólica", "")} {/* fallback label */}
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            view === "list"
              ? "bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          <List className="h-4 w-4" />
          {t.historial.titulo}
        </button>
      </div>

      {/* Gráfico */}
      {view === "chart" && chartData.length > 1 && (
        <GlassCard className="p-6">
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  domain={[0, "auto"]}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sistolica"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={t.historial.graficoSistolica}
                />
                <Line
                  type="monotone"
                  dataKey="diastolica"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={t.historial.graficoDiastolica}
                />
                {chartData.some((d) => d.pulso) && (
                  <Line
                    type="monotone"
                    dataKey="pulso"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={t.historial.graficoPulso}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Mensaje si no hay datos en chart */}
      {view === "chart" && chartData.length <= 1 && !loading && (
        <GlassCard className="p-12 text-center text-gray-400">
          {t.historial.sinMediciones}
        </GlassCard>
      )}

      {/* Tabla de mediciones */}
      {view === "list" && (
        <GlassCard variant="subtle" className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredMeasurements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {t.historial.sinMediciones}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200/50 dark:border-gray-700/30">
                    <TableHead>{t.historial.fecha}</TableHead>
                    <TableHead>{t.historial.sistolica}</TableHead>
                    <TableHead>{t.historial.diastolica}</TableHead>
                    <TableHead>{t.historial.pulso}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t.historial.brazo}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t.historial.posicion}
                    </TableHead>
                    <TableHead className="w-12">{t.historial.acciones}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeasurements.map((m) => {
                    const bp = bpCache[m.id]
                    return (
                      <TableRow key={m.id} className="border-gray-200/50 dark:border-gray-700/30">
                        <TableCell className="whitespace-nowrap">
                          {formatDate(m.measured_at, lang)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${bp.bgMuted} ${bp.color} border-0 font-mono`}
                          >
                            {m.systolic}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {m.diastolic}
                        </TableCell>
                        <TableCell className="font-mono">
                          {m.pulse || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">
                          {t.brazo[m.arm as keyof typeof t.brazo]}
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">
                          {t.posicion[m.position as keyof typeof t.posicion]}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(m.id)}
                            disabled={deleting === m.id}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
