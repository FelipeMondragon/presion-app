import { es } from "./es"
import { en } from "./en"

export type Lang = "es" | "en"
export type Translations = typeof es

const translations: Record<Lang, Translations> = { es, en }

export function getTranslations(lang: string): Translations {
  const key = lang === "en" ? "en" : "es"
  return translations[key]
}
