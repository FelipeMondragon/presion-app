"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { AnimatedBg } from "@/components/animated-bg"
import { HeartLogo } from "@/components/heart-logo"
import { cn } from "@/lib/utils"
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

  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = `/${lang}/login`
  }

  const toggleLang = () => {
    const newLang = lang === "es" ? "en" : "es"
    const newPath = pathname.replace(`/${lang}`, `/${newLang}`)
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`
    window.location.href = newPath
  }

  const currentPath = pathname.split("/").pop() || ""

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <AnimatedBg />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 glass-subtle border-r border-gray-200/50 dark:border-gray-700/30 transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/30">
            <HeartLogo size="sm" animated />
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100">
                {t.app.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.app.tagline}
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={`/${lang}/${item.href}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  currentPath === item.href
                    ? "bg-white/70 text-red-600 shadow-sm dark:bg-white/10 dark:text-red-400"
                    : "text-gray-600 hover:bg-white/40 dark:text-gray-400 dark:hover:bg-white/5"
                )}
              >
                <item.icon className="h-5 w-5" />
                {t.nav[item.key]}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/30 p-3 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400"
              onClick={toggleLang}
            >
              <Languages className="h-5 w-5" />
              {lang === "es" ? "English" : "Español"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400 hover:text-red-600"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              {t.nav.cerrarSesion}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="glass-subtle flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/30 lg:hidden">
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
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400"
          >
            <X className="h-6 w-6 opacity-0" />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
