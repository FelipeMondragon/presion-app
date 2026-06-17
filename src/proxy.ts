import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const LOCALES = ["es", "en"]
const DEFAULT_LOCALE = "es"

const SESSION_COOKIE = "__Secure-next-auth.session-token"

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

  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(request.nextUrl)
  }

  const locale = pathname.split("/")[1] || DEFAULT_LOCALE

  const secret = process.env.NEXTAUTH_SECRET
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value?.slice(0, 20)

  let token = null
  try {
    token = await getToken({ req: request, secret })
  } catch {
    console.log("[proxy] getToken error", { pathname, hasSecret: !!secret, hasCookie: !!cookieValue })
  }

  if (pathname.startsWith(`/${locale}/login`) || pathname.startsWith(`/${locale}/signup`)) {
    const isLoggedIn = !!token
    if (isLoggedIn) {
      request.nextUrl.pathname = `/${locale}/dashboard`
      return NextResponse.redirect(request.nextUrl)
    }
    return NextResponse.next({ request })
  }

  const isAppRoute = pathname.match(/^\/(es|en)\/(dashboard|registrar|historial|exportar|configuracion)/)
  if (isAppRoute) {
    const isLoggedIn = !!token
    if (!isLoggedIn) {
      request.nextUrl.pathname = `/${locale}/login`
      return NextResponse.redirect(request.nextUrl)
    }
    return NextResponse.next({ request })
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
