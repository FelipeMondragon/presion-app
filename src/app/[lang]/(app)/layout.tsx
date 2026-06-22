import { AppLayout } from "./_components/app-layout"
import { NotificationManager } from "@/components/notification-manager"

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return (
    <AppLayout params={params}>
      <NotificationManager lang={lang} />
      {children}
    </AppLayout>
  )
}
