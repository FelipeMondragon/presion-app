import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

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

  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(request.nextUrl)
  }

  const locale = pathname.split("/")[1] || DEFAULT_LOCALE

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token

  if (isLoggedIn && (pathname.endsWith("/login") || pathname.endsWith("/signup"))) {
    request.nextUrl.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(request.nextUrl)
  }

  const isAppRoute = pathname.match(/^\/(es|en)\/(dashboard|registrar|historial|exportar|configuracion)/)
  if (!isLoggedIn && isAppRoute) {
    request.nextUrl.pathname = `/${locale}/login`
    return NextResponse.redirect(request.nextUrl)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
