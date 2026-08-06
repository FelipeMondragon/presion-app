import type { BPClassification } from "./bp-classifier"

export type BPRangeEntry = {
  classification: BPClassification
  sistolica: string
  diastolica: string
  color: string
  bgColor: string
}

export const BP_RANGES: BPRangeEntry[] = [
  {
    classification: "normal",
    sistolica: "< 120",
    diastolica: "< 80",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950",
  },
  {
    classification: "elevada",
    sistolica: "120 \u2013 129",
    diastolica: "< 80",
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-950",
  },
  {
    classification: "hipertensionGrado1",
    sistolica: "130 \u2013 139",
    diastolica: "80 \u2013 89",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950",
  },
  {
    classification: "hipertensionGrado2",
    sistolica: "\u2265 140",
    diastolica: "\u2265 90",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-950",
  },
  {
    classification: "crisisHipertensiva",
    sistolica: "> 180",
    diastolica: "> 120",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950",
  },
]
