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
    let tickId: ReturnType<typeof setInterval>
    let refreshId: ReturnType<typeof setInterval>
    let lastTimes: string[] = []
    let browserEnabled = false

    async function check() {
      if (cancelled) return
      try {
        const res = await fetch("/api/reminder-settings")
        const data = await res.json()
        if (!data) return

        if (data.browser_enabled && Notification.permission === "default") {
          const perm = await Notification.requestPermission()
          browserEnabled = perm === "granted"
        } else {
          browserEnabled = data.browser_enabled && Notification.permission === "granted"
        }
        lastTimes = data.times
      } catch {
        return
      }
    }

    async function tick() {
      if (!browserEnabled || lastTimes.length === 0) return

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

      if (lastTimes.includes(currentTime)) {
        new Notification(t.app.name, {
          body: t.dashboard.notificarHora,
          icon: "/icons/icon-192.svg",
        })
      }
    }

    check().then(() => {
      tickId = setInterval(tick, 60_000)
      refreshId = setInterval(check, 300_000)
    })

    return () => {
      cancelled = true
      clearInterval(tickId)
      clearInterval(refreshId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  return null
}
