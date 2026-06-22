import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  username: text("username").unique(),
  securityQuestion: text("security_question").notNull().default(""),
  securityAnswer: text("security_answer").notNull().default(""),
  role: text("role").notNull().default("user"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
})

export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  systolic: integer("systolic").notNull(),
  diastolic: integer("diastolic").notNull(),
  pulse: integer("pulse"),
  arm: text("arm").notNull().default("left"),
  position: text("position").notNull().default("sitting"),
  notes: text("notes"),
  measuredAt: text("measured_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index("idx_measurements_user_id").on(table.userId),
  measuredAtIdx: index("idx_measurements_measured_at").on(table.measuredAt),
  userDateIdx: index("idx_measurements_user_date").on(table.userId, table.measuredAt),
}))

export const reminderSettings = sqliteTable("reminder_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  times: text("times").notNull().default('["08:00","20:00"]'),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
  browserEnabled: integer("browser_enabled", { mode: "boolean" }).notNull().default(true),
  timezone: text("timezone").notNull().default("America/Chihuahua"),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
})
