import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client"
import { migrate } from "drizzle-orm/libsql/migrator"
import { join } from "path"
import * as schema from "./schema"
import { seed } from "./seed"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })

migrate(db, {
  migrationsFolder: join(process.cwd(), "drizzle"),
})
  .then(() => seed(db))
  .catch((err) => {
    console.error("Migration failed:", err)
  })
