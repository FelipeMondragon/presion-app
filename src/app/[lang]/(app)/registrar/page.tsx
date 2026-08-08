"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { BP_RANGES } from "@/lib/bp-ranges"
import { measurementSchema } from "@/lib/validators"
import { cn } from "@/lib/utils"
import { FloatingInput } from "@/components/floating-input"
import { GlassCard } from "@/components/glass-card"
import { SegmentedControl } from "@/components/segmented-control"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Heart, Loader2, AlertTriangle } from "lucide-react"

export default function RegistrarPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()
  const syncing = useRef(false)

  useEffect(() => {
    if (session?.user?.role === "admin") {
      router.replace(`/${lang}/panel`)
    }
  }, [session, router, lang])

  const [systolic, setSystolic] = useState(searchParams.get("s") || "")
  const [diastolic, setDiastolic] = useState(searchParams.get("d") || "")
  const [pulse, setPulse] = useState(searchParams.get("p") || "")
  const [arm, setArm] = useState(searchParams.get("a") || "left")
  const [position, setPosition] = useState(searchParams.get("pos") || "sitting")
  const [notes, setNotes] = useState(searchParams.get("n") || "")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedCrisis, setSavedCrisis] = useState<{ systolic: number; diastolic: number } | null>(null)

  const s = parseInt(systolic)
  const d = parseInt(diastolic)
  const hasValidNumbers = s >= 50 && s <= 300 && d >= 30 && d <= 200
  const classification = hasValidNumbers ? classifyBP(s, d) : null

  useEffect(() => {
    const timer = setTimeout(() => {
      if (syncing.current) return
      const sp = new URLSearchParams()
      if (systolic) sp.set("s", systolic)
      if (diastolic) sp.set("d", diastolic)
      if (pulse) sp.set("p", pulse)
      if (arm !== "left") sp.set("a", arm)
      if (position !== "sitting") sp.set("pos", position)
      if (notes) sp.set("n", notes)
      const qs = sp.toString()
      const newPath = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      window.history.replaceState(null, "", newPath)
    }, 300)
    return () => clearTimeout(timer)
  }, [systolic, diastolic, pulse, arm, position, notes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      systolic,
      diastolic,
      pulse,
      arm,
      position,
      notes,
    }

    const result = measurementSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err: { path: PropertyKey[]; message: string }) => {
        const field = err.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (!session?.user?.id) {
      router.push(`/${lang}/login`)
      return
    }

    setLoading(true)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systolic: result.data.systolic,
          diastolic: result.data.diastolic,
          pulse: result.data.pulse || null,
          arm: result.data.arm,
          position: result.data.position,
          notes: result.data.notes || null,
          measured_at: new Date().toISOString(),
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        toast.error(t.registrar.error)
        return
      }

      const response = (await res.json()) as {
        success: boolean
        id: string
        classification?: string
      }
      toast.success(t.registrar.exito)
      if (response.classification === "crisisHipertensiva") {
        setSavedCrisis({ systolic: result.data.systolic, diastolic: result.data.diastolic })
      }
      setSystolic("")
      setDiastolic("")
      setPulse("")
      setArm("left")
      setPosition("sitting")
      setNotes("")
    } catch {
      toast.error(t.auth.errorConexion)
    } finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t.registrar.titulo}
      </h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: Form */}
        <GlassCard className="p-6" variant="elevated">
          <form id="registrar-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Presión — grandes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                id="systolic"
                label={t.registrar.sistolica}
                type="number"
                value={systolic}
                onChange={setSystolic}
                placeholder={t.registrar.sistolicaPlaceholder}
                required
                error={errors.systolic}
                size="lg"
                min={50}
                max={300}
                step={1}
              />

              <FloatingInput
                id="diastolic"
                label={t.registrar.diastolica}
                type="number"
                value={diastolic}
                onChange={setDiastolic}
                placeholder={t.registrar.diastolicaPlaceholder}
                required
                error={errors.diastolic}
                size="lg"
                min={30}
                max={200}
                step={1}
              />
            </div>

            {/* Clasificación en vivo (mobile only) */}
            {classification && (
              <div className="rounded-lg p-3 text-center glass-subtle md:hidden">
                <p className={`text-sm font-semibold ${classification.color}`}>
                  {t.clasificacion[classification.classification]}
                </p>
              </div>
            )}

            {/* Alerta de lectura crítica */}
            {classification?.classification === "crisisHipertensiva" && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/50"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {t.registrar.crisisTitulo}
                  </p>
                </div>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {t.registrar.crisisMensaje}
                </p>
                <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">
                  {t.registrar.crisisUrgente}
                </p>
              </div>
            )}

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Pulso */}
            <FloatingInput
              id="pulse"
              label={t.registrar.pulso}
              type="number"
              value={pulse}
              onChange={setPulse}
              placeholder={t.registrar.pulsoPlaceholder}
              error={errors.pulse}
              min={30}
              max={250}
              step={1}
            />

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Brazo, Posición */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SegmentedControl
                value={arm}
                onValueChange={setArm}
                label={t.registrar.brazo}
                options={[
                  { value: "left", label: t.registrar.brazoIzquierdo },
                  { value: "right", label: t.registrar.brazoDerecho },
                ]}
              />

              <SegmentedControl
                value={position}
                onValueChange={setPosition}
                label={t.registrar.posicion}
                options={[
                  { value: "sitting", label: t.registrar.posicionSentado },
                  { value: "lying", label: t.registrar.posicionAcostado },
                  { value: "standing", label: t.registrar.posicionDePie },
                ]}
              />
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t.registrar.notas}
              </Label>
              <Textarea
                id="notes"
                placeholder={t.registrar.notasPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={500}
                className="rounded-xl border border-gray-200 bg-white/50 dark:border-gray-600 dark:bg-gray-900/50 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-400/20"
              />
            </div>
          </form>
        </GlassCard>

        {/* RIGHT: Live feedback (desktop) */}
        <div className="hidden md:block">
          <GlassCard className="p-6 lg:sticky lg:top-6 space-y-6" variant="elevated">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t.registrar.clasificacionEnVivo}
            </p>

            {classification ? (
              <>
                <div className="text-center space-y-1">
                  <div className="text-7xl font-mono font-bold tracking-tighter text-gray-900 dark:text-gray-100">
                    <span>{s}</span>
                    <span className="text-gray-300 dark:text-gray-600 mx-2">/</span>
                    <span>{d}</span>
                  </div>
                  <p className="text-sm text-gray-400">mmHg</p>
                </div>

                <div className={`h-2 w-full rounded-full ${classification.bgColor}`} />

                <p className={`text-center text-xl font-semibold ${classification.color}`}>
                  {t.clasificacion[classification.classification]}
                </p>

              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  {t.registrar.ingresaValores}
                </p>
              </div>
            )}

            {/* Reference values table */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t.registrar.referenciaTabla.titulo}
              </p>
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">
                        {t.registrar.referenciaTabla.categoria}
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                        {t.dashboard.sis}
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                        {t.dashboard.dia}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {BP_RANGES.map((r) => {
                      const isActive = classification?.classification === r.classification
                      return (
                        <tr
                          key={r.classification}
                          className={cn(
                            "border-t border-gray-100 dark:border-gray-800 transition-colors",
                            isActive && r.bgColor
                          )}
                        >
                          <td className={cn("px-2 py-1.5 font-medium", isActive ? r.color : "text-gray-700 dark:text-gray-300")}>
                            {t.clasificacion[r.classification]}
                          </td>
                          <td className={cn("px-2 py-1.5 text-right font-mono", isActive ? r.color : "text-gray-600 dark:text-gray-400")}>
                            {r.sistolica}
                          </td>
                          <td className={cn("px-2 py-1.5 text-right font-mono", isActive ? r.color : "text-gray-600 dark:text-gray-400")}>
                            {r.diastolica}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <Button
              type="submit"
              form="registrar-form"
              variant="gradient" className="w-full h-14 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.registrar.guardando}
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-5 w-5" fill="white" />
                  {t.registrar.guardar}
                </>
              )}
            </Button>
          </GlassCard>
        </div>
      </div>

      {/* Mobile submit button */}
      <div className="md:hidden">
        <Button
          type="submit"
          form="registrar-form"
          variant="gradient" className="w-full h-14 text-lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t.registrar.guardando}
            </>
          ) : (
            <>
              <Heart className="mr-2 h-5 w-5" fill="white" />
              {t.registrar.guardar}
            </>
          )}
        </Button>
      </div>

      {/* Diálogo de lectura crítica */}
      <Dialog
        open={!!savedCrisis}
        onOpenChange={(open) => {
          if (!open) setSavedCrisis(null)
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <DialogTitle className="text-red-700 dark:text-red-400">
                {t.registrar.crisisDialogoTitulo}
              </DialogTitle>
            </div>
            <DialogDescription>
              {savedCrisis && (
                <p className="my-2 text-center text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {savedCrisis.systolic}/{savedCrisis.diastolic}
                  <span className="ml-1 text-sm font-normal text-gray-400">{t.registrar.mmHg}</span>
                </p>
              )}
              {t.registrar.crisisMensaje} {t.registrar.crisisUrgente}
              <span className="mt-2 block">{t.registrar.crisisDialogoMensaje}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <DialogClose render={<Button variant="gradient" />}>
              {t.registrar.entendido}
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
