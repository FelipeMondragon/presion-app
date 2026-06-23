"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { getTranslations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import type { User } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function UsuariosPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "es"
  const t = getTranslations(lang)
  const { data: session } = useSession()

  useEffect(() => {
    if (session && session?.user?.role !== "admin") {
      router.replace(`/${lang}/dashboard`)
    }
  }, [session, router, lang])

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState({ email: "", password: "", name: "", username: "", role: "user" })
  const [saving, setSaving] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  useEffect(() => {
    if (!session?.user?.id) return
    if (session?.user?.role !== "admin") return
    fetch("/api/users").then(async (res) => {
      if (res.ok) setUsers(await res.json())
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const openCreate = () => {
    setEditingUser(null)
    setForm({ email: "", password: "", name: "", username: "", role: "user" })
    setAdminPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setForm({ email: user.email, password: "", name: user.name || "", username: user.username || "", role: user.role })
    setAdminPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)

    if (editingUser) {
      const body: Record<string, unknown> = {
        name: form.name,
        username: form.username,
        email: form.email,
        role: form.role,
        adminPassword,
      }
      if (newPassword) {
        if (newPassword !== confirmNewPassword) {
          toast.error(t.auth.contrasenasNoCoinciden)
          setSaving(false)
          return
        }
        if (newPassword.length < 6) {
          toast.error(t.auth.minimoCaracteres)
          setSaving(false)
          return
        }
        body.newPassword = newPassword
        body.confirmPassword = confirmNewPassword
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setSaving(false)
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || t.usuarios.error)
        return
      }
      toast.success(t.usuarios.exitoEditar)
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setSaving(false)
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || t.usuarios.error)
        return
      }
      toast.success(t.usuarios.exitoCrear)
    }

    setModalOpen(false)
    fetch("/api/users").then(async (res) => { if (res.ok) setUsers(await res.json()) })
  }

  const handleDelete = async (user: User) => {
    if (!confirm(t.usuarios.eliminarConfirmacion)) return
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || t.usuarios.error)
      return
    }
    toast.success(t.usuarios.exitoEliminar)
    fetch("/api/users").then(async (res) => { if (res.ok) setUsers(await res.json()) })
  }

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: t.usuarios.nombre,
        cell: ({ row }) => <span>{row.original.name || "—"}</span>,
      },
      {
        accessorKey: "username",
        header: t.usuarios.usuario,
        cell: ({ row }) => <span className="text-gray-600 dark:text-gray-400">{row.original.username || "—"}</span>,
      },
      {
        accessorKey: "email",
        header: t.usuarios.email,
      },
      {
        accessorKey: "role",
        header: t.usuarios.rol,
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${row.original.role === "admin" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
            {row.original.role === "admin" ? t.usuarios.admin : t.usuarios.user}
          </span>
        ),
      },
      {
        id: "actions",
        header: t.usuarios.acciones,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} className="text-gray-400 hover:text-blue-500">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original)}
              disabled={row.original.id === session?.user?.id}
              className="text-gray-400 hover:text-red-500 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [t, session, openEdit, handleDelete]
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t.usuarios.titulo}
        </h1>
        <Button
          onClick={openCreate}
          variant="gradient"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.usuarios.crear}
        </Button>
      </div>

      <GlassCard className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t.comun.cargando}
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-400 py-8">{t.usuarios.sinUsuarios}</p>
        ) : (
          <DataTable
            columns={columns}
            data={users}
            searchPlaceholder={t.usuarios.buscar ?? "Buscar..."}
          />
        )}
      </GlassCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? t.usuarios.editar : t.usuarios.crear}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.usuarios.nombre}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-subtle" />
            </div>
            <div className="space-y-2">
              <Label>{t.usuarios.usuario}</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="glass-subtle" />
            </div>
            <div className="space-y-2">
              <Label>{t.usuarios.email}</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="glass-subtle" />
            </div>
            <div className="space-y-2">
              <Label>{t.usuarios.rol}</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100"
              >
                <option value="user">{t.usuarios.user}</option>
                <option value="admin">{t.usuarios.admin}</option>
              </select>
            </div>

            {editingUser ? (
              <>
                <hr className="border-gray-100 dark:border-gray-800" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.usuarios.autorizacionRequerida}</p>
                <div className="space-y-2">
                  <Label>{t.usuarios.contrasenaAdmin}</Label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={t.usuarios.contrasenaAdminPlaceholder}
                    className="glass-subtle"
                  />
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div className="space-y-2">
                  <Label>{t.usuarios.nuevaContrasena} <span className="text-xs text-gray-400">({t.usuarios.contrasena})</span></Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-subtle"
                  />
                </div>
                {newPassword && (
                  <div className="space-y-2">
                    <Label>{t.usuarios.confirmarNuevaContrasena}</Label>
                    <Input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="glass-subtle"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>{t.usuarios.contrasena}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="glass-subtle"
                />
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || (editingUser !== null && !adminPassword)}
              variant="gradient" className="w-full"
            >
              {saving ? t.comun.cargando : t.comun.guardar}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
