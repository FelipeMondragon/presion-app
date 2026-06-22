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
} from "lucide-react"

const navItems = [
  { href: "dashboard", icon: Home, key: "dashboard" as const },
  { href: "registrar", icon: PlusCircle, key: "registrar" as const },
  { href: "historial", icon: History, key: "historial" as const },
  { href: "exportar", icon: FileDown, key: "exportar" as const },
  { href: "configuracion", icon: Settings, key: "configuracion" as const },
]

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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = `/${lang}/login`
  }

  const toggleLang = () => {
    const newLang = lang === "es" ? "en" : "es"
    const search = window.location.search
    const newPath = pathname.replace(`/${lang}`, `/${newLang}`) + search
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`
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

  const currentPath = pathname.split("/").pop() || ""

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <AnimatedBg />

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-3 rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
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
                {t.nav[item.key]}
              </Link>
            )
          })}
        </nav>

        <hr className="mx-4 border-gray-100 dark:border-gray-800" />

        {/* User info + dropdown menu */}
        {session?.user && (
          <div className="relative mx-3 mb-2" ref={userMenuRef}>
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

      {/* Main content */}
      <div className="relative flex flex-1 flex-col min-w-0">
        {/* Top header */}
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
          <div className="flex items-center gap-1">
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

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
