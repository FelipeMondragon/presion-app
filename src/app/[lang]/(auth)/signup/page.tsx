"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/glass-card"
import { HeartLogo } from "@/components/heart-logo"
import { FloatingInput } from "@/components/floating-input"
import { Loader2 } from "lucide-react"
import { signupSchema } from "@/lib/validators"

export default function SignupPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = signupSchema.safeParse({ email, password, confirmPassword })
    if (!result.success) {
      setError(result.error.issues[0]?.message || t.auth.errorRegistro)
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="relative w-full max-w-md pt-16">
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <HeartLogo size="xl" animated />
        </div>

        <GlassCard className="px-8 pb-8 pt-16" variant="elevated">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t.auth.hero}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t.auth.subhero}
            </p>
          </div>

          <hr className="mb-6 border-gray-200 dark:border-gray-700" />

          <form onSubmit={handleSignup} className="space-y-5">
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
              id="password"
              label={t.auth.contrasena}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            <FloatingInput
              id="confirmPassword"
              label={t.auth.confirmarContrasena}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-5 text-sm font-medium text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.comun.cargando}
                </>
              ) : (
                t.auth.registrarse
              )}
            </Button>
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
