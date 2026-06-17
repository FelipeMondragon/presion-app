"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/glass-card"
import { HeartLogo } from "@/components/heart-logo"
import { FloatingInput } from "@/components/floating-input"
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft, ChevronRight } from "lucide-react"
import { signupSchema } from "@/lib/validators"
import { cn } from "@/lib/utils"

const SECURITY_QUESTIONS = [
  "pregunta1",
  "pregunta2",
  "pregunta3",
  "pregunta4",
  "pregunta5",
] as const

interface StepDef {
  title: string
  description: string
}

const STEP_INFO = {
  key: ["info", "seguridad", "recuperacion"] as const,
}

export default function SignupPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const steps: StepDef[] = [
    { title: t.auth.nombre, description: t.auth.nombrePlaceholder },
    { title: t.auth.contrasena, description: t.auth.confirmarContrasena },
    { title: t.auth.preguntaSeguridad, description: t.auth.respuestaSeguridadPlaceholder },
  ]

  const handleBack = () => {
    setError("")
    setStep((s) => Math.max(1, s - 1))
  }

  const validateStep = (): boolean => {
    setError("")
    if (step === 1) {
      if (!email || !name || !username) {
        setError("Completá todos los campos")
        return false
      }
      const result = signupSchema.shape.email.safeParse(email)
      if (!result.success) { setError("Correo inválido"); return false }
      const uResult = signupSchema.shape.username.safeParse(username)
      if (!uResult.success) { setError(uResult.error.issues[0]?.message || "Usuario inválido"); return false }
    }
    if (step === 2) {
      if (!password || !confirmPassword) {
        setError("Completá todos los campos")
        return false
      }
      if (password.length < 6) { setError("Mínimo 6 caracteres"); return false }
      if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return false }
    }
    if (step === 3) {
      if (!securityQuestion || !securityAnswer) {
        setError("Completá todos los campos")
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(3, s + 1))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (step < 3) {
      handleNext()
      return
    }

    const result = signupSchema.safeParse({
      email, password, confirmPassword,
      name, username, securityQuestion, securityAnswer,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message || t.auth.errorRegistro)
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, username, securityQuestion, securityAnswer }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.auth.errorRegistro)
      setLoading(false)
      return
    }

    router.push(`/${lang}/login?registrado=true`)
    router.refresh()
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-lg pt-14">
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <HeartLogo size="lg" animated />
        </div>

        <GlassCard className="px-8 pb-8 pt-16" variant="elevated">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t.auth.crearCuenta}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {steps[step - 1].title} — {steps[step - 1].description}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all duration-500",
                    s === step && "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 scale-110 ring-2 ring-red-200 dark:ring-red-800",
                    s < step && "bg-green-500 text-white scale-100",
                    s > step && "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  )}
                >
                  {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      "h-0.5 w-10 rounded transition-all duration-500",
                      s < step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Step 1: Account Info */}
            {step === 1 && (
              <div className="space-y-4 transition-all duration-300">
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
                <FloatingInput
                  id="name"
                  label={t.auth.nombre}
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder={t.auth.nombrePlaceholder}
                  required
                  autoComplete="name"
                />
                <FloatingInput
                  id="username"
                  label={t.auth.nombreUsuario}
                  type="text"
                  value={username}
                  onChange={setUsername}
                  placeholder={t.auth.nombreUsuarioPlaceholder}
                  required
                  autoComplete="username"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                >
                  {t.comun.si} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <div className="space-y-4 transition-all duration-300">
                <FloatingInput
                  id="password"
                  label={t.auth.contrasena}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
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
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  suffixIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 active:scale-90"
                      tabIndex={-1}
                    >
                      <div className="relative h-5 w-5">
                        <EyeOff className={cn("h-5 w-5 absolute inset-0 transition-all duration-200", showConfirmPassword ? "opacity-0 scale-50 rotate-90" : "opacity-100 scale-100 rotate-0")} />
                        <Eye className={cn("h-5 w-5 absolute inset-0 transition-all duration-200", showConfirmPassword ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90")} />
                      </div>
                    </button>
                  }
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl text-sm font-medium"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                  >
                    {t.comun.si} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Security Question */}
            {step === 3 && (
              <div className="space-y-4 transition-all duration-300">
                <div className="space-y-1.5">
                  <label htmlFor="securityQuestion" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.auth.preguntaSeguridad}
                  </label>
                  <select
                    id="securityQuestion"
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100"
                  >
                    <option value="">-- {t.auth.preguntaSeguridad} --</option>
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q}>
                        {t.auth[q as keyof typeof t.auth] as string}
                      </option>
                    ))}
                  </select>
                </div>
                <FloatingInput
                  id="securityAnswer"
                  label={t.auth.respuestaSeguridad}
                  type="text"
                  value={securityAnswer}
                  onChange={setSecurityAnswer}
                  placeholder={t.auth.respuestaSeguridadPlaceholder}
                  required
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl text-sm font-medium"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.comun.cargando}</>
                    ) : (
                      <><CheckCircle className="mr-1 h-4 w-4" />{t.auth.registrarse}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t.auth.yaTienesCuenta}{" "}
            <Link
              href={`/${lang}/login`}
              className="font-medium text-red-500 hover:text-red-600"
            >
              {t.auth.iniciarSesion}
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
