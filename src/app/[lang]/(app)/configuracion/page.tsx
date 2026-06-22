"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GlassCard } from "@/components/glass-card"
import { toast } from "sonner"
import { Bell, Mail, Globe, Clock, Plus, X, Loader2 } from "lucide-react"
import type { ReminderSettings } from "@/lib/types"
import { LabeledSelect } from "@/components/labeled-select"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

const TIMEZONES = [
  "America/Chihuahua",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/New_York",
  "Europe/Madrid",
  "Europe/London",
]

export default function ConfiguracionPage() {
  const params = useParams()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()

  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [timezone, setTimezone] = useState("America/Chihuahua")
  const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00", "20:00"])
  const [browserNotifs, setBrowserNotifs] = useState(true)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    async function loadSettings() {
      if (!session?.user?.id) {
        setLoadingSettings(false)
        return
      }

      setUserEmail(session.user.email || "")
      setUserName(session.user.name || "")

      const res = await fetch("/api/reminder-settings")
      const data = await res.json()

      if (data) {
        setReminderTimes(data.times)
        setBrowserNotifs(data.browser_enabled)
        setEmailNotifs(data.email_enabled)
        setTimezone(data.timezone)
      }

      setLoadingSettings(false)
    }

    loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const addTime = () => {
    setReminderTimes((prev) => [...prev, "12:00"])
  }

  const removeTime = (index: number) => {
    if (reminderTimes.length <= 1) return
    setReminderTimes((prev) => prev.filter((_, i) => i !== index))
  }

  const updateTime = (index: number, value: string) => {
    const newTimes = [...reminderTimes]
    newTimes[index] = value
    setReminderTimes(newTimes)
  }

  const handleBrowserToggle = async (checked: boolean) => {
    setBrowserNotifs(checked)
    if (checked && typeof Notification !== "undefined" && Notification.permission === "default") {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        toast.error(t.configuracion.permisoDenegado)
      }
    }
  }

  const handleSaveReminders = async () => {
    setSaving(true)
    if (!session?.user?.id) return

    const res = await fetch("/api/reminder-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        times: reminderTimes,
        email_enabled: emailNotifs,
        browser_enabled: browserNotifs,
        timezone,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || t.configuracion.errorGuardar)
      return
    }
    toast.success(t.configuracion.recordatoriosGuardados)
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const res = await fetch(`/api/users/${session?.user?.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName }),
    })
    setSavingProfile(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || t.configuracion.errorGuardar)
      return
    }
    toast.success(t.configuracion.perfilActualizado)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(t.auth.contrasenasNoCoinciden)
      return
    }
    if (newPassword.length < 6) {
      toast.error(t.auth.minimoCaracteres)
      return
    }
    setChangingPassword(true)
    const res = await fetch(`/api/users/${session?.user?.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirmNewPassword }),
    })
    setChangingPassword(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || t.configuracion.errorGuardar)
      return
    }
    toast.success(t.configuracion.contrasenaCambiada)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
  }

  const toggleLang = () => {
    const newLang = lang === "es" ? "en" : "es"
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`
    window.location.href = window.location.href.replace(`/${lang}/`, `/${newLang}/`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t.configuracion.titulo}
      </h1>

      {/* Perfil */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {t.configuracion.perfil}
        </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500 dark:text-gray-400">
                {t.configuracion.email}
              </Label>
              <Input
                value={userEmail}
                disabled
                className="glass-subtle border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-500 dark:text-gray-400">
                {t.auth.nombre}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="flex-1 glass-subtle border-gray-200 dark:border-gray-600"
                />
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  variant="outline"
                  className="shrink-0 glass-subtle border-gray-200 dark:border-gray-600"
                >
                  {savingProfile ? t.comun.cargando : t.configuracion.guardarPerfil}
                </Button>
              </div>
            </div>

          {mounted && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-500 dark:text-gray-400">
                {t.configuracion.modoOscuro}
              </Label>
              <Button
                variant="outline"
                className="w-full justify-between glass-subtle border-gray-200 dark:border-gray-600"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <span>{theme === "dark" ? t.configuracion.oscuro : t.configuracion.claro}</span>
                {theme === "dark" ? <Moon className="h-4 w-4 text-gray-400" /> : <Sun className="h-4 w-4 text-gray-400" />}
              </Button>
            </div>
          )}

          <LabeledSelect
            value={timezone}
            onValueChange={setTimezone}
            label={t.configuracion.zonaHoraria}
            options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
          />

          <div className="space-y-2">
            <Label className="text-sm text-gray-500 dark:text-gray-400">
              {t.configuracion.idioma}
            </Label>
            <Button
              variant="outline"
              className="w-full justify-between glass-subtle border-gray-200 dark:border-gray-600"
              onClick={toggleLang}
            >
              <span>{lang === "es" ? t.configuracion.español : t.configuracion.ingles}</span>
              <Globe className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Cambiar contraseña */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {t.configuracion.cambiarContrasena}
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-gray-500 dark:text-gray-400">
              {t.configuracion.contrasenaActual}
            </Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="glass-subtle border-gray-200 dark:border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-500 dark:text-gray-400">
              {t.configuracion.nuevaContrasena}
            </Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="glass-subtle border-gray-200 dark:border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-500 dark:text-gray-400">
              {t.configuracion.confirmarNuevaContrasena}
            </Label>
            <Input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="glass-subtle border-gray-200 dark:border-gray-600"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 border-0"
          >
            {changingPassword ? t.configuracion.cambiandoContrasena : t.configuracion.cambiarContrasena}
          </Button>
        </div>
      </GlassCard>

      {/* Recordatorios */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-100">
          <Bell className="h-5 w-5 text-red-500" />
          {t.configuracion.recordatorios}
        </h2>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t.comun.cargando}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t.configuracion.horarios}
            </p>
            <div className="space-y-4">
              <div className="space-y-3">
                {reminderTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="w-32 glass-subtle border-gray-200 dark:border-gray-600"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTime(index)}
                      disabled={reminderTimes.length <= 1}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTime}
                  className="mt-1 glass-subtle border-gray-200 dark:border-gray-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t.configuracion.agregarHorario}
                </Button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.configuracion.notificacionesNavegador}
                    </span>
                  </div>
                  <Switch
                    checked={browserNotifs}
                    onCheckedChange={handleBrowserToggle}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.configuracion.notificacionesEmail}
                    </span>
                  </div>
                  <Switch
                    checked={emailNotifs}
                    onCheckedChange={setEmailNotifs}
                  />
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 border-0"
                onClick={handleSaveReminders}
                disabled={saving || loadingSettings}
              >
                {saving ? t.comun.cargando : t.configuracion.guardarRecordatorios}
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  )
}
