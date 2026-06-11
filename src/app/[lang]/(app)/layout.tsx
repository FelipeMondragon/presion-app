import { AppLayout } from "./_components/app-layout"

export default function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  return (
    <AppLayout params={params}>
      {children}
    </AppLayout>
  )
}
