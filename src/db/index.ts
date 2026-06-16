export { db } from "./client"

import { migrate } from "drizzle-orm/libsql/migrator"
import { join } from "path"
import { db } from "./client"
import { seed } from "./seed"

migrate(db, {
  migrationsFolder: join(process.cwd(), "drizzle"),
})
  .then(() => seed(db))
  .catch((err) => {
    console.error("Migration failed:", err)
  })
