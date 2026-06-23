"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { GlassCard } from "@/components/glass-card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Users, Activity, Heart } from "lucide-react"
import { formatDate } from "@/lib/utils"

type AdminMeasurement = {
  id: string
  userId: string
  systolic: number
  diastolic: number
  pulse: number | null
  arm: string
  position: string
  notes: string | null
  measuredAt: string
  createdAt: string
  userName: string | null
  userEmail: string
}

export default function PanelPage() {
  const params = useParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()
  const router = useRouter()

  const [measurements, setMeasurements] = useState<AdminMeasurement[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const panelColumns = useMemo<ColumnDef<AdminMeasurement>[]>(
    () => [
      {
        accessorKey: "userName",
        header: t.panel.usuario,
        cell: ({ row }) => <span>{row.original.userName || row.original.userEmail}</span>,
      },
      {
        accessorKey: "systolic",
        header: t.panel.sistolica,
        cell: ({ row }) => <span className="font-mono">{row.original.systolic}</span>,
      },
      {
        accessorKey: "diastolic",
        header: t.panel.diastolica,
        cell: ({ row }) => <span className="font-mono">{row.original.diastolic}</span>,
      },
      {
        accessorKey: "pulse",
        header: t.panel.pulso,
        cell: ({ row }) => <span className="font-mono">{row.original.pulse ?? "—"}</span>,
      },
      {
        accessorFn: (row) => new Date(row.measuredAt).getTime(),
        id: "measuredAt",
        header: t.panel.fecha,
        cell: ({ row }) => formatDate(row.original.measuredAt, lang, { dateStyle: "short", timeStyle: "short" }),
      },
    ],
    [t, lang]
  )

  useEffect(() => {
    if (!session) return
    if (session?.user?.role !== "admin") {
      router.replace(`/${lang}/dashboard`)
      return
    }

    async function load() {
      const res = await fetch("/api/admin/measurements")
      if (!res.ok) return
      const json = await res.json()
      setMeasurements(json.data)
      setUserCount(json.users.length)
      setLoading(false)
    }
    load()
  }, [session, router, lang])

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-gray-400" />
        <span className="text-gray-400">{t.comun.cargando}</span>
      </div>
    )
  }

  const avgSystolic = measurements.length
    ? Math.round(measurements.reduce((s, m) => s + m.systolic, 0) / measurements.length)
    : 0
  const avgDiastolic = measurements.length
    ? Math.round(measurements.reduce((s, m) => s + m.diastolic, 0) / measurements.length)
    : 0
  const avgPulse = measurements.some((m) => m.pulse)
    ? Math.round(
        measurements.filter((m) => m.pulse).reduce((s, m) => s + (m.pulse ?? 0), 0) /
          measurements.filter((m) => m.pulse).length
      )
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t.panel.titulo}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4" />
            {t.panel.totalUsuarios}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {userCount}
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Activity className="h-4 w-4" />
            {t.panel.totalMediciones}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {measurements.length}
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Heart className="h-4 w-4 text-red-500" />
            {t.panel.promedioGeneral}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {avgSystolic}/{avgDiastolic}
            <span className="ml-1 text-sm font-normal text-gray-400">{t.panel.mmhg}</span>
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Activity className="h-4 w-4" />
            {t.panel.pulso}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {avgPulse ?? "—"}
            {avgPulse && <span className="ml-1 text-sm font-normal text-gray-400">{t.panel.bpm}</span>}
          </p>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t.panel.ultimasMediciones}
        </h2>
        {measurements.length === 0 ? (
          <p className="py-8 text-center text-gray-400">{t.panel.sinMediciones}</p>
        ) : (
          <DataTable
            columns={panelColumns}
            data={measurements}
            pageSize={25}
            searchPlaceholder={t.panel.buscar ?? "Buscar..."}
          />
        )}
      </GlassCard>
    </div>
  )
}
