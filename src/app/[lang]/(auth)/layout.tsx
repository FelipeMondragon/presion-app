import { AnimatedBg } from "@/components/animated-bg"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <AnimatedBg />
      <div className="w-full">{children}</div>
    </div>
  )
}
