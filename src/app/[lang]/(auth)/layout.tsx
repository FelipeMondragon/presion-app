import { AnimatedBg } from "@/components/animated-bg"
import { LocaleThemeControls } from "@/components/locale-theme-controls"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <AnimatedBg />
      <LocaleThemeControls />
      <div className="w-full">{children}</div>
    </div>
  )
}
