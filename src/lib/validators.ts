import { z } from "zod"

export const measurementSchema = z.object({
  systolic: z.coerce
    .number()
    .int()
    .min(50, "Debe ser mayor a 50")
    .max(300, "Debe ser menor a 300"),
  diastolic: z.coerce
    .number()
    .int()
    .min(30, "Debe ser mayor a 30")
    .max(200, "Debe ser menor a 200"),
  pulse: z.coerce
    .number()
    .int()
    .min(30, "Debe ser mayor a 30")
    .max(250, "Debe ser menor a 250")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  arm: z.enum(["left", "right"]).optional().default("left"),
  position: z
    .enum(["sitting", "lying", "standing"])
    .optional()
    .default("sitting"),
  notes: z.string().max(500).optional().default(""),
  measured_at: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
})

export const signupSchema = z
  .object({
    email: z.string().email("Correo inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
    name: z.string().min(1, "El nombre es requerido").max(100),
    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(30, "Máximo 30 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
    securityQuestion: z.string().min(1, "Seleccioná una pregunta"),
    securityAnswer: z.string().min(1, "La respuesta es requerida"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email("Correo inválido"),
})

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Correo inválido"),
    answer: z.string().min(1, "La respuesta es requerida"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export const resetApiSchema = z.object({
  email: z.string().email("Correo inválido"),
  answer: z.string().min(1, "La respuesta es requerida"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
})

export const verifyAnswerSchema = z.object({
  email: z.string().email("Correo inválido"),
  answer: z.string().min(1, "La respuesta es requerida"),
})

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export const reminderSettingsSchema = z.object({
  times: z.array(z.string().regex(timePattern, "Formato de hora inválido (HH:MM)")).optional(),
  email_enabled: z.boolean().optional(),
  browser_enabled: z.boolean().optional(),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, "Zona horaria inválida").optional(),
})

export const signupApiSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(100),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  securityQuestion: z.string().min(1, "Seleccioná una pregunta"),
  securityAnswer: z.string().min(1, "La respuesta es requerida"),
})

export const createUserSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(100),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  role: z.enum(["admin", "user"]).default("user"),
})

export const updateUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100).optional(),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo")
    .optional(),
  email: z.string().email("Correo inválido").optional(),
  role: z.enum(["admin", "user"]).optional(),
  password: z.string().min(8, "Mínimo 8 caracteres").optional(),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100).optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

