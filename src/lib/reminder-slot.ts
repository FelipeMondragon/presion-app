export function currentSlot(times: string[], timezone: string, at: Date = new Date()): string | null {
  const tz = timezone || "UTC"

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: tz,
  }).format(at)

  if (!times.includes(time)) return null

  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(at)

  return `${date}T${time}`
}
