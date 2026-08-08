"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeartLogo } from "@/components/heart-logo"
import { Avatar } from "@/components/avatar"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { PlusCircle, Heart, Activity, TrendingUp, Share2 } from "lucide-react"
import Link from "next/link"
import { formatDate, cn } from "@/lib/utils"
import { ChartTooltip, type ChartTooltipEntry } from "@/components/chart-tooltip"
import { SegmentedControl } from "@/components/segmented-control"
import { trendStats, diffVsPrevious, dailyTrendPoints } from "@/lib/bp-trends"
import type { Measurement } from "@/lib/types"

const CLASSIFICATION_ORDER = ["normal", "elevada", "hipertensionGrado1", "hipertensionGrado2", "crisisHipertensiva"] as const
const SPECTRUM_BG = ["bg-green-400", "bg-yellow-400", "bg-amber-400", "bg-orange-400", "bg-red-400"]
const CARD_BORDERS = ["border-green-500", "border-yellow-500", "border-amber-500", "border-orange-500", "border-red-500"]

const CLASSIFICATION_HEX: Record<string, string> = {
  normal: "#22c55e",
  elevada: "#eab308",
  hipertensionGrado1: "#f59e0b",
  hipertensionGrado2: "#f97316",
  crisisHipertensiva: "#ef4444",
}

function weekdayShort(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { weekday: "short" })
    .format(date)
    .replace(".", "")
}

function ClassificationDot(props: {
  cx?: number
  cy?: number
  payload?: { classification?: string; latest?: boolean }
}) {
  const { cx, cy, payload } = props
  if (typeof cx !== "number" || typeof cy !== "number") return null
  const cls = payload?.classification
  const color = cls ? CLASSIFICATION_HEX[cls] : "#d1d5db"
  return (
    <g>
      {payload?.latest && <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.25} />}
      <circle
        cx={cx}
        cy={cy}
        r={payload?.latest ? 4.5 : 3}
        fill={color}
        stroke="#fff"
        strokeWidth={1.5}
      />
    </g>
  )
}

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const { data: session, status } = useSession()

  useEffect(() => {
    if (session?.user?.role === "admin") {
      router.replace(`/${lang}/panel`)
    }
  }, [session, router, lang])

  const [readings, setReadings] = useState<Measurement[]>([])
  const [lastReading, setLastReading] = useState<Measurement | null>(null)
  const [period, setPeriod] = useState<"7" | "30" | "90">("7")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/measurements?limit=1000`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as Measurement[] | { data: Measurement[] }

        if (!cancelled && data) {
          const list = Array.isArray(data) ? data : (data as { data: Measurement[] }).data
          setReadings(list)
          setLastReading(list[0] || null)
        }
      } catch {
        if (!cancelled) {
          setReadings([])
          setLastReading(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (status === "authenticated" && session?.user?.id) loadData()

    return () => { cancelled = true }
  }, [session, status])

  const trend = useMemo(() => {
    const windowDays = parseInt(period, 10)
    return trendStats(readings, windowDays)
  }, [readings, period])

  const diff = diffVsPrevious(trend.current, trend.previous)

  const { current } = trend
  const avgSys = current.avgSys ?? 0
  const avgDia = current.avgDia ?? 0
  const avgPulse = current.avgPulse

  const lastClassification = lastReading
    ? classifyBP(lastReading.systolic, lastReading.diastolic)
    : null
  const spectrumIndex = lastClassification
    ? CLASSIFICATION_ORDER.indexOf(lastClassification.classification)
    : -1
  const avgClassification =
    avgSys > 0 ? classifyBP(avgSys, avgDia) : null
  const avgSpectrumIndex = avgClassification
    ? CLASSIFICATION_ORDER.indexOf(avgClassification.classification)
    : -1

  const renderWeeklyTooltip = (point: Record<string, unknown> | undefined, entries: ChartTooltipEntry[]) => {
    const date = point?.date as Date | undefined
    const classification = point?.classification as ReturnType<typeof classifyBP> | undefined
    const count = point?.count as number | undefined
    return (
      <>
        <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {date ? formatDate(date, lang, { dateStyle: "medium" }) : ""}
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">{t.dashboard.sinRegistros}</p>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <p key={e.name} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                <span className="text-gray-500 dark:text-gray-400">{e.name}</span>
                <span className="ml-auto pl-4 font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {e.value} mmHg
                </span>
              </p>
            ))}
          </div>
        )}
        {classification && entries.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Badge className={`${classification.bgColor} ${classification.color} border-0`}>
              {t.clasificacion[classification.classification]}
            </Badge>
            {typeof count === "number" && (
              <span className="text-[11px] text-gray-400">{count} {t.dashboard.registros}</span>
            )}
          </div>
        )}
      </>
    )
  }

  const trendDayLabel = (date: Date) =>
    period === "7"
      ? weekdayShort(date, lang)
      : new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", {
          day: "2-digit",
          month: "2-digit",
        }).format(date)

  const chartData = useMemo(() => {
    const days = dailyTrendPoints(readings, parseInt(period, 10))
    if (days.length === 0) return []

    const points = days.map((d) => {
      const classification =
        d.sys != null && d.dia != null ? classifyBP(d.sys, d.dia) : null
      return {
        day: trendDayLabel(d.date),
        date: d.date,
        count: d.count,
        sys: d.sys,
        dia: d.dia,
        classification,
        latest: false,
      }
    })

    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].count > 0) {
        points[i].latest = true
        break
      }
    }
    return points
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, period, lang])

  const handleShare = async () => {
    const text = lastReading
      ? `${t.dashboard.compartirTextoLectura.replace("{sis}", String(lastReading.systolic)).replace("{dia}", String(lastReading.diastolic))} ${t.dashboard.compartirTexto.replace("{app}", t.app.name).replace("{url}", window.location.origin)}`
      : t.dashboard.compartirTextoSin.replace("{app}", t.app.name).replace("{url}", window.location.origin)

    if (navigator.share) {
      await navigator.share({ title: t.app.name, text })
    } else {
      await navigator.clipboard.writeText(text)
      toast.success(t.dashboard.linkCopiado)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">{t.comun.cargando}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.dashboard.titulo}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleShare}
            className="glass-subtle border-gray-200 dark:border-gray-600 dark:text-gray-400"
            aria-label={t.dashboard.compartir}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Link href={`/${lang}/registrar`}>
            <Button variant="gradient" className="h-10 sm:h-9">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.nav.registrar}
            </Button>
          </Link>
        </div>
      </div>

      {/* User profile card */}
      {session?.user && (
        <GlassCard className="p-4" variant="subtle">
          <div className="flex items-center gap-4">
            <Avatar
              email={session.user.email}
              name={session.user.name || session.user.username}
              size="md"
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {session.user.name || session.user.username || session.user.email}
              </p>
              {session.user.username && (
                <p className="text-sm text-gray-400">@{session.user.username}</p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Hero — Última medición */}
      <GlassCard className="p-6" variant="elevated">
        {lastReading && lastClassification ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
                <Heart className="h-5 w-5 text-red-500" fill="red" />
                {t.dashboard.ultimaMedicion}
              </h2>
              <p className="mt-1 shrink-0 text-xs text-gray-400">
                {formatDate(lastReading.measured_at, lang, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>

            {/* SIS / DIA display */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <div className="flex gap-2 sm:gap-3">
                <div className={`flex-1 sm:flex-initial rounded-xl border-l-4 ${CARD_BORDERS[spectrumIndex]} bg-white/50 p-2 sm:p-3 dark:bg-gray-900/50 min-w-0`}>
                  <p className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {lastReading.systolic}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                    {t.dashboard.sis}
                  </p>
                </div>

                <span className="mt-2 sm:mt-3 text-xl text-gray-300 dark:text-gray-600 self-start shrink-0">/</span>

                <div className={`flex-1 sm:flex-initial rounded-xl border-l-4 ${CARD_BORDERS[spectrumIndex]} bg-white/50 p-2 sm:p-3 dark:bg-gray-900/50 min-w-0`}>
                  <p className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {lastReading.diastolic}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                    {t.dashboard.dia}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 sm:mt-1 shrink-0">
                <p className="text-xs sm:text-sm text-gray-400">{t.dashboard.mmhg}</p>
                <Badge className={`${lastClassification.bgColor} ${lastClassification.color} border-0`}>
                  {t.clasificacion[lastClassification.classification]}
                </Badge>
              </div>
            </div>

            {/* Spectrum bar */}
            <div className="space-y-0.5">
              <div className="relative">
                <div className="flex h-2 overflow-hidden rounded-full">
                  {SPECTRUM_BG.map((bg, i) => (
                    <div key={i} className={cn("flex-1", bg)} />
                  ))}
                </div>
                {spectrumIndex >= 0 && (
                  <div
                    className="absolute -top-1.5 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-gray-400 bg-white shadow-xs"
                    style={{ left: `${(spectrumIndex * 20) + 10}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                {[t.clasificacion.normal, t.dashboard.spectrumElevada, "H1", "H2", t.dashboard.spectrumCrisis].map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              {lastReading.pulse && (
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {lastReading.pulse} {t.dashboard.bpm}
                </span>
              )}
              {lastReading.arm && (
                <span>{t.brazo[lastReading.arm as keyof typeof t.brazo]}</span>
              )}
              {lastReading.position && (
                <span>{t.posicion[lastReading.position as keyof typeof t.posicion]}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <HeartLogo size="xl" animated />
            <p className="mt-4">{t.dashboard.sinMediciones}</p>
            <Link href={`/${lang}/registrar`}>
              <Button variant="outline" size="lg" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.nav.registrar}
              </Button>
            </Link>
          </div>
        )}
      </GlassCard>

      {/* Stats */}
      {current.count > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GlassCard className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Activity className="h-4 w-4" />
              {t.dashboard.promedioPeriodo}
            </p>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {avgSys}/{avgDia}
                <span className="ml-1 text-sm font-normal text-gray-400">{t.dashboard.mmhg}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {avgClassification && (
                  <Badge className={`${avgClassification.bgColor} ${avgClassification.color} border-0`}>
                    {t.clasificacion[avgClassification.classification]}
                  </Badge>
                )}
                {avgPulse && <span className="text-sm text-gray-400">{avgPulse} {t.dashboard.bpm}</span>}
              </div>
              <p className="text-xs text-gray-400">
                {diff.avgSys != null && diff.avgDia != null
                  ? `${diff.avgSys > 0 ? "+" : ""}${diff.avgSys}/${diff.avgDia > 0 ? "+" : ""}${diff.avgDia} ${t.dashboard.mmhg} ${t.dashboard.comparacion}`
                  : t.dashboard.sinPeriodoAnterior}
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-4 w-4" />
              {t.dashboard.clasificacion}
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {current.count}
                </span>
                <span className="text-sm text-gray-400">{t.dashboard.registros}</span>
              </div>
              <p className="text-xs text-gray-400">
                {current.daysWithData} {t.dashboard.diasConDatos}
                {current.crisisCount > 0 && (
                  <span className="ml-1 text-red-500">· {current.crisisCount} {t.dashboard.crisisEnPeriodo}</span>
                )}
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Activity className="h-4 w-4" />
              {t.dashboard.variabilidad}
            </p>
            <div className="space-y-2">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {current.stdDevSys != null ? `±${current.stdDevSys}` : "—"}
                <span className="text-sm font-normal text-gray-400"> / </span>
                {current.stdDevDia != null ? `±${current.stdDevDia}` : "—"}
                <span className="ml-1 text-sm font-normal text-gray-400">{t.dashboard.mmhg}</span>
              </p>
              <p className="text-xs text-gray-400">{t.dashboard.desviacionEstandar}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length > 0 && (
        <GlassCard className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-4 w-4" />
                {t.dashboard.tendencias}
              </p>
              <SegmentedControl
                value={period}
                onValueChange={(v) => setPeriod(v as "7" | "30" | "90")}
                label=""
                options={[
                  { value: "7", label: t.dashboard.dias7 },
                  { value: "30", label: t.dashboard.dias30 },
                  { value: "90", label: t.dashboard.dias90 },
                ]}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                {t.dashboard.sistolicaShort}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                {t.dashboard.diastolicaShort}
              </span>
            </div>
          </div>

          {/* Spectrum */}
          {avgClassification && (
            <div className="mb-3">
              <div className="relative">
                <div className="flex h-1.5 overflow-hidden rounded-full">
                  {SPECTRUM_BG.map((bg, i) => (
                    <div key={i} className={cn("flex-1", bg)} />
                  ))}
                </div>
                {avgSpectrumIndex >= 0 && (
                  <div
                    className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-gray-800 shadow-sm dark:border-gray-900 dark:bg-gray-200"
                    style={{ left: `${(avgSpectrumIndex * 20) + 10}%` }}
                  />
                )}
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                {[t.clasificacion.normal, t.dashboard.spectrumElevada, "H1", "H2", t.dashboard.spectrumCrisis].map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}

          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis width={42} tick={{ fontSize: 11 }} stroke="#9ca3af" tickLine={false} axisLine={false} domain={["dataMin - 10", "dataMax + 10"]} />
                <Tooltip
                  content={<ChartTooltip render={renderWeeklyTooltip} />}
                  cursor={{ stroke: "#9ca3af", strokeDasharray: "4 4", strokeOpacity: 0.4 }}
                />
                <Line type="monotone" dataKey="sys" name={t.dashboard.sistolicaShort} stroke="#ef4444" strokeWidth={2.5} dot={<ClassificationDot />} activeDot={{ r: 5 }} connectNulls={false} />
                <Line type="monotone" dataKey="dia" name={t.dashboard.diastolicaShort} stroke="#3b82f6" strokeWidth={2.5} dot={<ClassificationDot />} activeDot={{ r: 5 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
