"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"

export function NotificationManager({ lang }: { lang?: string }) {
  const { data: session } = useSession()
  const t = getTranslations(lang || "es")

  useEffect(() => {
    if (!session?.user?.id) return
    if (typeof Notification === "undefined") return

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval>
    let lastTimes: string[] = []
    let browserEnabled = false
    let first = true

    async function check() {
      if (cancelled) return
      try {
        const res = await fetch("/api/reminder-settings")
        const data = await res.json()
        if (!data) return

        if (first && data.browser_enabled && Notification.permission === "default") {
          const perm = await Notification.requestPermission()
          browserEnabled = perm === "granted" && data.browser_enabled
        } else {
          browserEnabled = data.browser_enabled && Notification.permission === "granted"
        }
        lastTimes = data.times
        first = false
      } catch {
        return
      }
    }

    async function tick() {
      if (!browserEnabled || lastTimes.length === 0) return

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const min = now.getMinutes()

      // Only check on exact minute boundaries to avoid duplicates
      if (lastTimes.includes(currentTime)) {
        new Notification(t.app.name, {
          body: t.dashboard.notificarHora,
          icon: "/icons/icon-192.svg",
        })
      }
    }

    // Initial setup
    check().then(() => {
      // Then check every minute
      intervalId = setInterval(tick, 60_000)
      // Refresh settings every 5 min
      setInterval(check, 300_000)
    })

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [session?.user?.id])

  return null
}
