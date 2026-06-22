export type Measurement = {
  id: string
  user_id: string
  systolic: number
  diastolic: number
  pulse: number | null
  arm: string
  position: string
  notes: string | null
  measured_at: string
  created_at: string
}

export type User = {
  id: string
  email: string
  name: string | null
  username: string | null
  role: string
  createdAt: string
}

export type ReminderSettings = {
  user_id: string
  times: string[]
  email_enabled: boolean
  browser_enabled: boolean
  timezone: string
  updated_at: string
}
