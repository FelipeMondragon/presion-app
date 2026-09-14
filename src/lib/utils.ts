import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

export function formatChartTick(ts: number, spanMs: number, lang: string, timeZone?: string): string {
  const locale = lang === "en" ? "en-US" : "es-MX"
  const base = timeZone ? { timeZone } : undefined

  if (spanMs < 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, ...base }).format(new Date(ts))
  }
  if (spanMs > 180 * 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat(locale, { month: "2-digit", year: "2-digit", ...base }).format(new Date(ts))
  }
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", ...base }).format(new Date(ts))
}

export function formatDate(
  date: Date | string,
  lang: string,
  options?: { dateStyle?: Intl.DateTimeFormatOptions["dateStyle"]; timeStyle?: Intl.DateTimeFormatOptions["timeStyle"]; showYear?: boolean }
): string {
  const d = typeof date === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date) : date
  const locale = lang === "en" ? "en-US" : "es-MX"

  if (options?.dateStyle && options?.timeStyle) {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: options.dateStyle,
      timeStyle: options.timeStyle,
    }).format(d)
  }

  if (options?.dateStyle) {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: options.dateStyle,
    }).format(d)
  }

  const showYear = options?.showYear ?? true
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: showYear ? "2-digit" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatDateShort(date: Date | string, lang: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const locale = lang === "en" ? "en-US" : "es-MX"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
  }).format(d)
}
