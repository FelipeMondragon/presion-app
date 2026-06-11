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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
