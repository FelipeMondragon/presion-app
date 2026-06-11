import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(
  date: Date | string,
  lang: string,
  options?: { dateStyle?: Intl.DateTimeFormatOptions["dateStyle"]; timeStyle?: Intl.DateTimeFormatOptions["timeStyle"]; showYear?: boolean }
): string {
  const d = typeof date === "string" ? new Date(date) : date
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
