"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/glass-card"
import { HeartLogo } from "@/components/heart-logo"
import { FloatingInput } from "@/components/floating-input"
import { Loader2 } from "lucide-react"
import { loginSchema } from "@/lib/validators"
import { toast } from "sonner"

export default function LoginPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get("registrado") === "true") {
      toast.success(t.auth.cuentaCreada)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      setError(result.error.issues[0]?.message || t.auth.errorCredenciales)
      return
    }

    setLoading(true)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError(t.auth.errorCredenciales)
      setLoading(false)
      return
    }

    window.location.href = `/${lang}/dashboard`
  }

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
      {/* LEFT: Hero (desktop only) */}
      <div className="hidden lg:flex flex-col items-center text-center space-y-6">
        <HeartLogo size="xl" animated />
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {t.auth.hero}
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400 max-w-sm">
            {t.auth.subhero}
          </p>
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="w-full max-w-md mx-auto lg:mx-0">
        <GlassCard className="p-8" variant="elevated">
          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <HeartLogo size="md" animated />
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {t.auth.hero}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.auth.subhero}
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <FloatingInput
              id="email"
              label={t.auth.email}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
              error={error && !email ? error : undefined}
            />

            <FloatingInput
              id="password"
              label={t.auth.contrasena}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              autoComplete="current-password"
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
                t.auth.ingresar
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t.auth.noTienesCuenta}{" "}
            <Link
              href={`/${lang}/signup`}
              className="font-medium text-red-500 hover:text-red-600"
            >
              {t.auth.crearCuenta}
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
