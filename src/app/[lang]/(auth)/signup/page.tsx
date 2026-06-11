"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
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
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${lang}/login`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(`/${lang}/login?registrado=true`)
    router.refresh()
  }

  return (
    <GlassCard className="p-8" variant="elevated">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <HeartLogo size="lg" animated />
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t.auth.hero}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.auth.subhero}
          </p>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
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
  )
}
