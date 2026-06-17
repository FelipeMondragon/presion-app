"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeartLogo } from "@/components/heart-logo"
import { Avatar } from "@/components/avatar"
import { PlusCircle, Heart, Activity, TrendingUp } from "lucide-react"
import Link from "next/link"
import { formatDate, cn } from "@/lib/utils"
import type { Measurement } from "@/lib/types"

const CLASSIFICATION_ORDER = ["normal", "elevada", "hipertensionGrado1", "hipertensionGrado2", "crisisHipertensiva"] as const
const SPECTRUM_BG = ["bg-green-400", "bg-yellow-400", "bg-amber-400", "bg-orange-400", "bg-red-400"]
const SPECTRUM_LABELS = ["Normal", "Elevada", "H1", "H2", "Crisis"]
const CARD_BORDERS = ["border-green-500", "border-yellow-500", "border-amber-500", "border-orange-500", "border-red-500"]

export default function DashboardPage() {
  const params = useParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [lastReading, setLastReading] = useState<Measurement | null>(null)
  const [weeklyReadings, setWeeklyReadings] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  const { data: session } = useSession()

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!session?.user?.id) return
      setLoading(true)

      const res = await fetch("/api/measurements")
      const data: Measurement[] = await res.json()

      if (!cancelled) {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        setLastReading(data[0] || null)
        setWeeklyReadings(
          data.filter((m) => new Date(m.measured_at) >= weekAgo)
        )
      }
      if (!cancelled) setLoading(false)
    }

    loadData()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const avgSystolic = weeklyReadings.length
    ? Math.round(
        weeklyReadings.reduce((sum, m) => sum + m.systolic, 0) /
          weeklyReadings.length
      )
    : 0
  const avgDiastolic = weeklyReadings.length
    ? Math.round(
        weeklyReadings.reduce((sum, m) => sum + m.diastolic, 0) /
          weeklyReadings.length
      )
    : 0
  const avgPulse = weeklyReadings.some((m) => m.pulse)
    ? Math.round(
        weeklyReadings
          .filter((m) => m.pulse)
          .reduce((sum, m) => sum + (m.pulse || 0), 0) /
          weeklyReadings.filter((m) => m.pulse).length
      )
    : null

  const lastClassification = lastReading
    ? classifyBP(lastReading.systolic, lastReading.diastolic)
    : null
  const spectrumIndex = lastClassification
    ? CLASSIFICATION_ORDER.indexOf(lastClassification.classification)
    : -1
  const avgClassification =
    avgSystolic > 0 ? classifyBP(avgSystolic, avgDiastolic) : null

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
        <Link href={`/${lang}/registrar`}>
          <Button className="border-0 bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.nav.registrar}
          </Button>
        </Link>
      </div>

      {/* User profile card */}
      <GlassCard className="p-4" variant="subtle">
        <div className="flex items-center gap-4">
          <Avatar
            email={session?.user?.email}
            name={session?.user?.name || session?.user?.username}
            size="md"
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {session?.user?.name || session?.user?.username || session?.user?.email}
            </p>
            {session?.user?.username && (
              <p className="text-sm text-gray-400">@{session.user.username}</p>
            )}
          </div>
        </div>
      </GlassCard>

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
            <div className="flex items-start gap-2 sm:gap-3">
              <div className={`flex-1 rounded-xl border-l-4 ${CARD_BORDERS[spectrumIndex]} bg-white/50 p-3 dark:bg-gray-900/50`}>
                <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
                  {lastReading.systolic}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  {t.dashboard.sis}
                </p>
              </div>

              <span className="mt-3 text-xl text-gray-300 dark:text-gray-600">/</span>

              <div className={`flex-1 rounded-xl border-l-4 ${CARD_BORDERS[spectrumIndex]} bg-white/50 p-3 dark:bg-gray-900/50`}>
                <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
                  {lastReading.diastolic}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  {t.dashboard.dia}
                </p>
              </div>

              <div className="mt-1 shrink-0 text-right">
                <p className="text-sm text-gray-400">{t.dashboard.mmhg}</p>
                <Badge className={`mt-1 ${lastClassification.bgColor} ${lastClassification.color} border-0`}>
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
                {SPECTRUM_LABELS.map((l) => (
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
              <Button variant="outline" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.nav.registrar}
              </Button>
            </Link>
          </div>
        )}
      </GlassCard>

      {/* Stats */}
      {weeklyReadings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Activity className="h-4 w-4" />
              {t.dashboard.promedioSemanal}
            </p>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {avgSystolic}/{avgDiastolic}
                <span className="ml-1 text-sm font-normal text-gray-400">{t.dashboard.mmhg}</span>
              </p>
              <div className="flex items-center gap-2">
                {avgClassification && (
                  <Badge className={`${avgClassification.bgColor} ${avgClassification.color} border-0`}>
                    {t.clasificacion[avgClassification.classification]}
                  </Badge>
                )}
                {avgPulse && <span className="text-sm text-gray-400">{avgPulse} {t.dashboard.bpm}</span>}
              </div>
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
                  {weeklyReadings.length}
                </span>
                <span className="text-sm text-gray-400">{t.dashboard.registros}</span>
              </div>
              <p className="text-xs text-gray-400">{t.dashboard.estaSemana}</p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
