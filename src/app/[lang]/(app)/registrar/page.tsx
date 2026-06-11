"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getTranslations } from "@/lib/translations"
import { classifyBP } from "@/lib/bp-classifier"
import { measurementSchema } from "@/lib/validators"
import { FloatingInput } from "@/components/floating-input"
import { GlassCard } from "@/components/glass-card"
import { LabeledSelect } from "@/components/labeled-select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Heart, Loader2 } from "lucide-react"

export default function RegistrarPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [pulse, setPulse] = useState("")
  const [arm, setArm] = useState("left")
  const [position, setPosition] = useState("sitting")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const s = parseInt(systolic)
  const d = parseInt(diastolic)
  const hasValidNumbers = s >= 50 && s <= 300 && d >= 30 && d <= 200
  const classification = hasValidNumbers ? classifyBP(s, d) : null

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

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${lang}/login`)
      return
    }

    const { error } = await supabase.from("measurements").insert({
      user_id: user.id,
      systolic: result.data.systolic,
      diastolic: result.data.diastolic,
      pulse: result.data.pulse || null,
      arm: result.data.arm,
      position: result.data.position,
      notes: result.data.notes || null,
      measured_at: new Date().toISOString(),
    })

    setLoading(false)

    if (error) {
      toast.error(error.message || t.registrar.error)
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
          <form id="registrar-form" onSubmit={handleSubmit} className="space-y-4">
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

            {/* Pulso, Brazo, Posición */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FloatingInput
                id="pulse"
                label={t.registrar.pulso}
                type="number"
                value={pulse}
                onChange={setPulse}
                placeholder={t.registrar.pulsoPlaceholder}
                error={errors.pulse}
              />

              <LabeledSelect
                value={arm}
                onValueChange={setArm}
                label={t.registrar.brazo}
                options={[
                  { value: "left", label: t.registrar.brazoIzquierdo },
                  { value: "right", label: t.registrar.brazoDerecho },
                ]}
              />

              <LabeledSelect
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

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm text-gray-500 dark:text-gray-400">
                {t.registrar.notas}
              </Label>
              <Textarea
                id="notes"
                placeholder={t.registrar.notasPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={500}
                className="glass-subtle border-gray-200 dark:border-gray-600 focus:border-red-400"
              />
            </div>
          </form>
        </GlassCard>

        {/* RIGHT: Live feedback (desktop) */}
        <div className="hidden md:block">
          <GlassCard className="p-6 lg:sticky lg:top-6 space-y-6" variant="elevated">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Clasificación en vivo
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
                  Normal: &lt;120/80 mmHg
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  Ingresa sistólica y diastólica
                </p>
              </div>
            )}

            <Button
              type="submit"
              form="registrar-form"
              className="w-full h-14 text-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 border-0"
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
          className="w-full h-14 text-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 border-0"
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
