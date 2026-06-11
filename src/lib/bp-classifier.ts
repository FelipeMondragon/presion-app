export type BPClassification =
  | "normal"
  | "elevada"
  | "hipertensionGrado1"
  | "hipertensionGrado2"
  | "crisisHipertensiva"

export type BPLevel = {
  classification: BPClassification
  color: string
  bgColor: string
  bgMuted: string
}

export function classifyBP(systolic: number, diastolic: number): BPLevel {
  if (systolic > 180 || diastolic > 120) {
    return {
      classification: "crisisHipertensiva",
      color: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-950",
      bgMuted: "bg-red-50 dark:bg-red-950/50",
    }
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      classification: "hipertensionGrado2",
      color: "text-orange-700 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-950",
      bgMuted: "bg-orange-50 dark:bg-orange-950/50",
    }
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      classification: "hipertensionGrado1",
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-950",
      bgMuted: "bg-amber-50 dark:bg-amber-950/50",
    }
  }
  if (systolic >= 120 && diastolic < 80) {
    return {
      classification: "elevada",
      color: "text-yellow-700 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-950",
      bgMuted: "bg-yellow-50 dark:bg-yellow-950/50",
    }
  }
  return {
    classification: "normal",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950",
    bgMuted: "bg-green-50 dark:bg-green-950/50",
  }
}
