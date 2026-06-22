"use client"

import { useSyncExternalStore } from "react"
import { useParams, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { getTranslations } from "@/lib/translations"
import { Sun, Moon, Languages } from "lucide-react"

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function LocaleThemeControls() {
  const params = useParams()
  const pathname = usePathname()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { theme, setTheme } = useTheme()
  const mounted = useHydrated()

  const toggleLang = () => {
    const newLang = lang === "es" ? "en" : "es"
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`
    window.location.href = pathname.replace(`/${lang}`, `/${newLang}`)
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200 backdrop-blur-sm"
          aria-label={theme === "dark" ? t.configuracion.claro : t.configuracion.oscuro}
        >
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      )}
      <button
        onClick={toggleLang}
        className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200 backdrop-blur-sm"
        title={lang === "es" ? "English" : "Español"}
      >
        <Languages className="h-5 w-5" />
      </button>
    </div>
  )
}
