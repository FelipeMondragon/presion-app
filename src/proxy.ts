import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const LOCALES = ["es", "en"]
const DEFAULT_LOCALE = "es"

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value
  if (cookieLocale && LOCALES.includes(cookieLocale)) return cookieLocale

  const acceptLang = request.headers.get("accept-language") || ""
  for (const locale of LOCALES) {
    if (acceptLang.startsWith(locale)) return locale
  }

  return DEFAULT_LOCALE
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameHasLocale = LOCALES.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // 1. Redirigir al locale correspondiente ANTES de cualquier otra cosa
  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(request.nextUrl)
  }

  // Extraer locale del pathname para las redirecciones que siguen
  const locale = pathname.split("/")[1] || DEFAULT_LOCALE

  // 2. Intentar obtener el usuario de Supabase (envuelto en try-catch
  //    para que la app funcione aunque falten credenciales de Supabase)
  let user = null
  let supabaseResponse = NextResponse.next({ request })

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
    } catch {
      // Si falla Supabase (sin credenciales, timeout, etc.), seguimos sin usuario
    }
  }

  // 3. Proteger rutas de auth de usuarios autenticados
  if (user && (pathname.endsWith("/login") || pathname.endsWith("/signup"))) {
    request.nextUrl.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(request.nextUrl)
  }

  // 4. Proteger rutas de la app de usuarios no autenticados
  const isAppRoute = pathname.match(/^\/(es|en)\/(dashboard|registrar|historial|exportar|configuracion)/)
  if (!user && isAppRoute) {
    request.nextUrl.pathname = `/${locale}/login`
    return NextResponse.redirect(request.nextUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
