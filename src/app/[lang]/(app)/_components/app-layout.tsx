"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { getTranslations } from "@/lib/translations"
import { AnimatedBg } from "@/components/animated-bg"
import { HeartLogo } from "@/components/heart-logo"
import { Avatar } from "@/components/avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Home,
  PlusCircle,
  History,
  FileDown,
  Settings,
  LogOut,
  Menu,
  X,
  Languages,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Share2,
  LayoutDashboard,
  Users,
} from "lucide-react"

function getNavItems(role?: string) {
  interface NavItem { href: string; icon: React.ComponentType<{ className?: string }>; key: string }
  if (role === "admin") {
    return [
      { href: "panel", icon: LayoutDashboard, key: "panel" },
      { href: "usuarios", icon: Users, key: "usuarios" },
      { href: "configuracion", icon: Settings, key: "configuracion" },
    ]
  }
  return [
    { href: "dashboard", icon: Home, key: "dashboard" },
    { href: "registrar", icon: PlusCircle, key: "registrar" },
    { href: "historial", icon: History, key: "historial" },
    { href: "exportar", icon: FileDown, key: "exportar" },
    { href: "configuracion", icon: Settings, key: "configuracion" },
  ]
}

function getBottomTabs(role?: string) {
  interface TabItem { href: string; icon: React.ComponentType<{ className?: string }>; key: string }
  if (role === "admin") {
    return [
      { href: "panel", icon: LayoutDashboard, key: "panel" },
      { href: "usuarios", icon: Users, key: "usuarios" },
      { href: "configuracion", icon: Settings, key: "configuracion" },
    ]
  }
  return [
    { href: "dashboard", icon: Home, key: "dashboard" },
    { href: "registrar", icon: PlusCircle, key: "registrar" },
    { href: "historial", icon: History, key: "historial" },
    { href: "exportar", icon: FileDown, key: "exportar" },
    { href: "configuracion", icon: Settings, key: "configuracion" },
  ]
}

export function AppLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const params = useParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    let startX = 0
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onTouchEnd = (e: TouchEvent) => {
      if (sidebarOpen && e.changedTouches[0].clientX - startX > 80) {
        setSidebarOpen(false)
      }
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [sidebarOpen])

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = `/${lang}/login`
  }

  const toggleLang = () => {
    const newLang = lang === "es" ? "en" : "es"
    const search = window.location.search
    const newPath = pathname.replace(`/${lang}`, `/${newLang}`) + search
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`
    window.location.href = newPath
  }

  const handleShare = async () => {
    const text = session?.user
      ? t.dashboard.compartirTexto.replace("{app}", t.app.name).replace("{url}", window.location.origin)
      : t.dashboard.compartirTextoSin.replace("{app}", t.app.name).replace("{url}", window.location.origin)

    if (navigator.share) {
      await navigator.share({ title: t.app.name, text })
    } else {
      await navigator.clipboard.writeText(text)
      toast.success(t.dashboard.linkCopiado)
    }
  }

  const navItems = getNavItems(session?.user?.role)
  const bottomTabs = getBottomTabs(session?.user?.role)
  const currentPath = pathname.split("/").pop() || ""

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="hidden sm:block"><AnimatedBg /></div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "fixed top-0 bottom-14 sm:bottom-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-3 rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 px-6 pb-3 pt-6">
          <HeartLogo size="md" animated />
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {t.app.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.app.tagline}
            </p>
          </div>
        </div>

        <hr className="mx-4 border-gray-100 dark:border-gray-800" />

        {/* Desktop nav items */}
        <nav className="hidden sm:block flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = currentPath === item.href
            return (
              <Link
                key={item.href}
                href={`/${lang}/${item.href}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]")} />
                {t.nav[item.key as keyof typeof t.nav]}
              </Link>
            )
          })}
        </nav>

        {session?.user && (
          <div className="mt-auto relative mx-3 mb-2" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800"
            >
              <Avatar
                email={session.user.email}
                name={session.user.name || session.user.username}
                size="sm"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {session.user.name || session.user.email}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {session.user.email}
                </p>
              </div>
              {userMenuOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              )}
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-gray-100 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                {/* Mobile extras inside user menu */}
                <div className="sm:hidden space-y-1 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { handleShare(); setUserMenuOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <Share2 className="h-4 w-4" />
                    {t.dashboard.compartir}
                  </button>
                  {mounted && (
                    <button
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      {theme === "dark" ? t.configuracion.oscuro : t.configuracion.claro}
                    </button>
                  )}
                  <button
                    onClick={toggleLang}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <Languages className="h-4 w-4" />
                    {lang === "es" ? "English" : "Español"}
                  </button>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  {t.nav.cerrarSesion}
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="relative flex flex-1 flex-col min-w-0">
        <header className="glass-subtle flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-400"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <HeartLogo size="sm" />
            <span className="font-semibold text-sm">{t.app.name}</span>
          </div>
          {/* Desktop: theme, share, lang, logout */}
          <div className="hidden sm:flex items-center gap-1">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label={theme === "dark" ? t.configuracion.oscuro : t.configuracion.claro}
              >
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={handleShare}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label={t.dashboard.compartir}
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={toggleLang}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:text-gray-700"
              title={lang === "es" ? "English" : "Español"}
            >
              <Languages className="h-5 w-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              title={t.nav.cerrarSesion}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-24 sm:pb-4 md:pb-6 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-white/90 backdrop-blur-lg border-t border-gray-200 dark:bg-gray-900/90 dark:border-gray-700 select-none pb-safe">
        {bottomTabs.map((tab) => {
          const isActive = currentPath === tab.href
          return (
            <Link
              key={tab.href}
              href={`/${lang}/${tab.href}`}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <tab.icon className={cn("h-6 w-6", isActive && "drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]")} />
              <span>{t.nav[tab.key as keyof typeof t.nav]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
