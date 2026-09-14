import { readFileSync } from "fs"
import { migrate } from "drizzle-orm/libsql/migrator"

// ponytail: drizzle-kit migrate crashes on Windows/Node 24 (libuv assertion); this is the same migrator without the CLI
async function main() {
  const envPath = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local"
  try {
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.error(`❌ ${envPath} not found`)
    process.exit(1)
  }

  const { db } = await import("./client")
  await migrate(db, { migrationsFolder: "drizzle" })
  console.log("✅ migrations applied")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err.message)
    process.exit(1)
  })
