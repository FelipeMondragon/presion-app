"use client"

import { useEffect, useState, useDeferredValue, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, Loader2, BarChart3, List } from "lucide-react"
import { LabeledSelect } from "@/components/labeled-select"
import { SegmentedControl } from "@/components/segmented-control"
import { ChartTooltip, type ChartTooltipEntry } from "@/components/chart-tooltip"
import { formatDate } from "@/lib/utils"
import type { Measurement } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function HistorialPage() {
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

  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const deferredFilter = useDeferredValue(filter)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [view, setView] = useState<"chart" | "list">("chart")
  const [metric, setMetric] = useState<"bp" | "pulse">("bp")

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

  const columns = useMemo<ColumnDef<Measurement>[]>(
    () => [
      {
        accessorKey: "measured_at",
        header: t.historial.fecha,
        cell: ({ row }) => formatDate(row.original.measured_at, lang),
      },
      {
        accessorKey: "systolic",
        header: t.historial.sistolica,
        cell: ({ row }) => {
          const bp = bpCache[row.original.id]
          return (
            <Badge className={`${bp.bgMuted} ${bp.color} border-0 font-mono`}>
              {row.original.systolic}
            </Badge>
          )
        },
      },
      {
        accessorKey: "diastolic",
        header: t.historial.diastolica,
        cell: ({ row }) => <span className="font-mono">{row.original.diastolic}</span>,
      },
      {
        accessorKey: "pulse",
        header: t.historial.pulso,
        cell: ({ row }) => <span className="font-mono">{row.original.pulse || "-"}</span>,
      },
      {
        accessorKey: "arm",
        header: t.historial.brazo,
        cell: ({ row }) => t.brazo[row.original.arm as keyof typeof t.brazo],
        enableSorting: false,
      },
      {
        accessorKey: "position",
        header: t.historial.posicion,
        cell: ({ row }) => t.posicion[row.original.position as keyof typeof t.posicion],
        enableSorting: false,
      },
      {
        id: "actions",
        header: t.historial.acciones,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original.id)}
            disabled={deleting === row.original.id}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [t, lang, bpCache, deleting, handleDelete]
  )

  const chartData = useMemo(
    () =>
      [...filteredMeasurements]
        .reverse()
        .map((m) => ({
          ts: new Date(m.measured_at).getTime(),
          sys: m.systolic,
          dia: m.diastolic,
          pulse: m.pulse,
          classification: classifyBP(m.systolic, m.diastolic),
          measured_at: m.measured_at,
        })),
    [filteredMeasurements]
  )

  const yDomain = metric === "bp" ? ["dataMin - 15", "dataMax + 5"] : ["dataMin - 8", "dataMax + 8"]

  const xTickFormatter = (v: number) => {
    const min = chartData[0]?.ts ?? v
    const max = chartData[chartData.length - 1]?.ts ?? v
    const locale = lang === "en" ? "en-US" : "es-MX"
    if (max - min < 24 * 60 * 60 * 1000) {
      return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(v))
    }
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(new Date(v))
  }

  const renderHistTooltip = (point: Record<string, unknown> | undefined, entries: ChartTooltipEntry[]) => {
    const measuredAt = point?.measured_at as string | undefined
    const classification = point?.classification as ReturnType<typeof classifyBP> | undefined
    return (
      <>
        <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {measuredAt ? formatDate(measuredAt, lang, { dateStyle: "medium", timeStyle: "short" }) : ""}
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">{t.historial.sinMediciones}</p>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <p key={e.name} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                <span className="text-gray-500 dark:text-gray-400">{e.name}</span>
                <span className="ml-auto pl-4 font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {e.value}{metric === "pulse" ? " bpm" : " mmHg"}
                </span>
              </p>
            ))}
          </div>
        )}
        {metric === "bp" && classification && (
          <div className="mt-2">
            <Badge className={`${classification.bgColor} ${classification.color} border-0`}>
              {t.clasificacion[classification.classification]}
            </Badge>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + filtros */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.historial.titulo}
        </h1>
        <div className="w-full sm:w-40">
          <LabeledSelect
            value={filter}
            onValueChange={setFilter}
            label=""
            options={[
              { value: "all", label: t.historial.filtroTodo },
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
          {t.historial.grafico}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl
              value={metric}
              onValueChange={(v) => setMetric(v as "bp" | "pulse")}
              label=""
              options={[
                { value: "bp", label: t.historial.metricaPresion },
                { value: "pulse", label: t.historial.metricaPulso },
              ]}
            />
          </div>
          <div className="h-64 min-h-[200px] sm:h-[420px] lg:h-[460px]">
            <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={xTickFormatter}
                  stroke="#9ca3af"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={<ChartTooltip render={renderHistTooltip} />}
                  cursor={{ stroke: "#9ca3af", strokeDasharray: "4 4", strokeOpacity: 0.4 }}
                />
                {metric === "bp" ? (
                  <>
                    <ReferenceLine y={120} stroke="#9ca3af" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <ReferenceLine y={80} stroke="#9ca3af" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Line
                      type="monotone"
                      dataKey="sys"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 4.5 }}
                      name={t.historial.graficoSistolica}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="dia"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 4.5 }}
                      name={t.historial.graficoDiastolica}
                      connectNulls={false}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="pulse"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4.5 }}
                    name={t.historial.graficoPulso}
                    connectNulls={false}
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
        <GlassCard className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredMeasurements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {t.historial.sinMediciones}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredMeasurements}
              searchPlaceholder={t.historial.buscar ?? "Buscar..."}
            />
          )}
        </GlassCard>
      )}
    </div>
  )
}
