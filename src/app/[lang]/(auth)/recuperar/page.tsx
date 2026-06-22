"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/glass-card"
import { HeartLogo } from "@/components/heart-logo"
import { FloatingInput } from "@/components/floating-input"
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react"
import { forgotPasswordSchema, resetPasswordSchema, verifyAnswerSchema } from "@/lib/validators"
import { cn } from "@/lib/utils"

export default function RecuperarPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0]?.message)
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.auth.errorCredenciales)
      return
    }

    const data = await res.json()
    const qKey = data.question as string
    setQuestion(t.auth[qKey as keyof typeof t.auth] as string)
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = verifyAnswerSchema.safeParse({ email, answer })
    if (!result.success) {
      setError(result.error.issues[0]?.message)
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answer }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.auth.respuestaIncorrecta)
      return
    }

    setStep(3)
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = resetPasswordSchema.safeParse({
      email,
      answer,
      newPassword,
      confirmPassword,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message)
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answer, newPassword }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.auth.errorRegistro)
      return
    }

    router.push(`/${lang}/login?contrasenaCambiada=true`)
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="relative w-full max-w-md pt-16">
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <HeartLogo size="xl" animated />
        </div>

        <GlassCard className="px-8 pb-8 pt-16" variant="elevated">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t.auth.recuperarContrasena}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {step === 1 && t.auth.paso1}
              {step === 2 && t.auth.paso2}
              {step === 3 && t.auth.paso3}
            </p>
          </div>

          <hr className="mb-6 border-gray-200 dark:border-gray-700" />

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  s === step
                    ? "bg-red-500 text-white"
                    : s < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400 dark:bg-gray-700"
                }`}
              >
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <FloatingInput
                id="email"
                label={t.auth.email}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="correo@ejemplo.com"
                required
                autoComplete="email"
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-5 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.comun.cargando}</>
                ) : (
                  t.auth.enviar
                )}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-5">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t.auth.preguntaSeguridad}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {question}
                </p>
              </div>

              <FloatingInput
                id="answer"
                label={t.auth.respuestaSeguridad}
                type="text"
                value={answer}
                onChange={setAnswer}
                placeholder={t.auth.respuestaSeguridadPlaceholder}
                required
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-5 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.comun.cargando}</>
                ) : (
                  t.auth.verificarRespuesta
                )}
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-5">
              <FloatingInput
                id="newPassword"
                label={t.auth.contrasena}
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={setNewPassword}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                suffixIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 active:scale-90"
                    tabIndex={-1}
                  >
                    <div className="relative h-5 w-5">
                      <EyeOff className={cn("h-5 w-5 absolute inset-0 transition-all duration-200", showPassword ? "opacity-0 scale-50 rotate-90" : "opacity-100 scale-100 rotate-0")} />
                      <Eye className={cn("h-5 w-5 absolute inset-0 transition-all duration-200", showPassword ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90")} />
                    </div>
                  </button>
                }
              />

              <FloatingInput
                id="confirmPassword"
                label={t.auth.confirmarContrasena}
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                suffixIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 active:scale-90"
                    tabIndex={-1}
                  >
                    <div className="relative h-5 w-5">
                      <EyeOff className={cn("h-5 w-5 absolute inset-0 transition-all duration-200", showConfirm ? "opacity-0 scale-50 rotate-90" : "opacity-100 scale-100 rotate-0")} />
                      <Eye className={cn("h-5 w-5 absolute inset-0 transition-all duration-200", showConfirm ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90")} />
                    </div>
                  </button>
                }
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-5 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.comun.cargando}</>
                ) : (
                  t.auth.cambiarContrasena
                )}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link
              href={`/${lang}/login`}
              className="inline-flex items-center gap-1 font-medium text-red-500 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.auth.iniciarSesion}
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
