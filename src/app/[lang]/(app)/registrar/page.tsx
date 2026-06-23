"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { measurementSchema } from "@/lib/validators"
import { FloatingInput } from "@/components/floating-input"
import { GlassCard } from "@/components/glass-card"
import { SegmentedControl } from "@/components/segmented-control"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Heart, Loader2 } from "lucide-react"

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
    })

    setLoading(false)

    if (!res.ok) {
      toast.error(t.registrar.error)
      return
    }

    toast.success(t.registrar.exito)
    setSystolic("")
    setDiastolic("")
    setPulse("")
    setArm("left")
    setPosition("sitting")
    setNotes("")
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
            <div className="grid grid-cols-2 gap-4">
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

                <p className="text-center text-xs text-gray-500">
                  {t.registrar.referenciaNormal}
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  {t.registrar.ingresaValores}
                </p>
              </div>
            )}

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
    </div>
  )
}
