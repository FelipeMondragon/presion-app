export function AnimatedBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] animate-blob rounded-full bg-red-400/30 blur-3xl dark:bg-red-600/15" />
      <div className="absolute top-1/3 -right-40 h-[450px] w-[450px] animate-blob rounded-full bg-blue-400/30 blur-3xl dark:bg-blue-600/15 [animation-delay:2s]" />
      <div className="absolute -bottom-40 left-1/3 h-[400px] w-[400px] animate-blob rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-600/10 [animation-delay:4s]" />
    </div>
  )
}
