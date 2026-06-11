"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Heart, Activity, TrendingUp } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import type { Measurement } from "@/lib/types"

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [lastReading, setLastReading] = useState<Measurement | null>(null)
  const [weeklyReadings, setWeeklyReadings] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/${lang}/login`)
        return
      }

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data } = await supabase
        .from("measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })

      if (!cancelled && data) {
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
  }, [])

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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.dashboard.titulo}
        </h1>
        <Link href={`/${lang}/registrar`}>
          <Button className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 border-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.nav.registrar}
          </Button>
        </Link>
      </div>

      {/* Última medición */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-100">
          <Heart className="h-5 w-5 text-red-500" fill="red" />
          {t.dashboard.ultimaMedicion}
        </h2>
        {lastReading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {lastReading.systolic}/{lastReading.diastolic}
                <span className="text-lg font-normal text-gray-400 ml-1">
                  mmHg
                </span>
              </div>
              {lastClassification && (
                <Badge
                  className={`text-sm px-3 py-1 ${lastClassification.bgColor} ${lastClassification.color} border-0`}
                >
                  {t.clasificacion[lastClassification.classification]}
                </Badge>
              )}
            </div>
            {lastReading.pulse ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <Activity className="inline h-4 w-4 mr-1" />
                {lastReading.pulse} bpm
              </p>
            ) : null}
            <p className="text-sm text-gray-400">
              {formatDate(lastReading.measured_at, lang, {
                dateStyle: "long",
                timeStyle: "short",
              })}
              {lastReading.arm && ` · ${t.brazo[lastReading.arm as keyof typeof t.brazo]}`}
              {lastReading.position &&
                ` · ${t.posicion[lastReading.position as keyof typeof t.posicion]}`}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Heart className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>{t.dashboard.sinMediciones}</p>
            <Link href={`/${lang}/registrar`}>
              <Button variant="outline" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.nav.registrar}
              </Button>
            </Link>
          </div>
        )}
      </GlassCard>

      {/* Promedios */}
      {weeklyReadings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard className="p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t.dashboard.promedioSemanal}
            </p>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {avgSystolic}/{avgDiastolic}
              <span className="text-sm font-normal text-gray-400 ml-1">
                mmHg
              </span>
            </div>
            {avgPulse ? (
              <p className="text-sm text-gray-400 mt-1">{avgPulse} bpm</p>
            ) : null}
            {avgClassification && (
              <Badge
                className={`mt-2 ${avgClassification.bgMuted} ${avgClassification.color} border-0`}
              >
                {t.clasificacion[avgClassification.classification]}
              </Badge>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t.dashboard.clasificacion}
            </p>
            <div className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              <TrendingUp className="h-6 w-6 text-red-400" />
              {weeklyReadings.length} registros
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {t.dashboard.promedioSemanal.toLowerCase()}
            </p>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
