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

export type MeasurementFormData = z.infer<typeof measurementSchema>

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

export const signupSchema = z
  .object({
    email: z.string().email("Correo inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
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
    newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export const reminderSettingsSchema = z.object({
  times: z.array(z.string()).optional(),
  email_enabled: z.boolean().optional(),
  browser_enabled: z.boolean().optional(),
  timezone: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
