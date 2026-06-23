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
import { Bell, Mail, Globe, Clock, Plus, X, Loader2, User, Lock, ChevronRight, Sun, Moon } from "lucide-react"
import type { ReminderSettings } from "@/lib/types"
import { LabeledSelect } from "@/components/labeled-select"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

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

const SECTIONS = [
  { id: "cuenta", icon: User, labelKey: "cuenta" as const },
  { id: "seguridad", icon: Lock, labelKey: "seguridad" as const },
  { id: "notificaciones", icon: Bell, labelKey: "notificaciones" as const },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

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
  const [activeSection, setActiveSection] = useState<SectionId>("cuenta")
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

  const sectionTitle = t.configuracion[SECTIONS.find((s) => s.id === activeSection)!.labelKey]
  const sectionDesc = t.configuracion[`${activeSection}Desc` as keyof typeof t.configuracion] as string

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t.configuracion.titulo}
      </h1>

      {/* Mobile section picker */}
      <div className="flex sm:hidden gap-1 rounded-xl p-1 glass-subtle">
        {SECTIONS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all flex-1",
              activeSection === id
                ? "bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden xs:inline">{t.configuracion[id as keyof typeof t.configuracion]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <nav className="hidden sm:flex w-48 shrink-0 flex-col gap-1">
          {SECTIONS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left",
                activeSection === id
                  ? "bg-red-50 text-red-700 shadow-sm dark:bg-red-900/20 dark:text-red-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t.configuracion[id as keyof typeof t.configuracion]}</span>
              {activeSection === id && <ChevronRight className="ml-auto h-4 w-4 text-red-400" />}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Shared header */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{sectionTitle}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sectionDesc}</p>
          </div>

          {/* Cuenta */}
          {activeSection === "cuenta" && (
            <GlassCard className="p-6">
              <div className="space-y-5">
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

                <hr className="border-gray-100 dark:border-gray-800" />

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
          )}

          {/* Seguridad */}
          {activeSection === "seguridad" && (
            <GlassCard className="p-6">
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
                  variant="gradient"
                  className="w-full"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                >
                  {changingPassword ? t.configuracion.cambiandoContrasena : t.configuracion.cambiarContrasena}
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Notificaciones */}
          {activeSection === "notificaciones" && (
            <GlassCard className="p-6">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.comun.cargando}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {t.configuracion.horarios}
                    </p>
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
                  </div>

                  <hr className="border-gray-100 dark:border-gray-800" />

                  <div className="space-y-4">
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
                    variant="gradient"
                    className="w-full"
                    onClick={handleSaveReminders}
                    disabled={saving || loadingSettings}
                  >
                    {saving ? t.comun.cargando : t.configuracion.guardarRecordatorios}
                  </Button>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
