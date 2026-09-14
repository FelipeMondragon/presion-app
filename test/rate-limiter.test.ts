import { strictEqual } from "node:assert"
import { sql } from "drizzle-orm"

async function main() {
  process.env.TURSO_DATABASE_URL = ":memory:"
  const { db } = await import("../src/db/client")
  const { checkRateLimit } = await import("../src/lib/rate-limiter")

  await db.run(sql`CREATE TABLE rate_limits ("key" text PRIMARY KEY, "count" integer NOT NULL, "reset_at" integer NOT NULL)`)

  strictEqual(await checkRateLimit("k", 3, 60_000), true)
  strictEqual(await checkRateLimit("k", 3, 60_000), true)
  strictEqual(await checkRateLimit("k", 3, 60_000), true)
  strictEqual(await checkRateLimit("k", 3, 60_000), false)
  strictEqual(await checkRateLimit("other", 3, 60_000), true)

  // concurrent calls count atomically
  const burst = await Promise.all(Array.from({ length: 5 }, () => checkRateLimit("burst", 2, 60_000)))
  strictEqual(burst.filter(Boolean).length, 2)

  // expired window resets the counter
  strictEqual(await checkRateLimit("exp", 1, 10), true)
  strictEqual(await checkRateLimit("exp", 1, 10), false)
  await new Promise((r) => setTimeout(r, 15))
  strictEqual(await checkRateLimit("exp", 1, 10), true)

  console.log("✅ rate-limiter.test.ts — all assertions passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
