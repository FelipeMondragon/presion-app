import { sql, lt } from "drizzle-orm"
import { db } from "@/db/client"
import { rateLimits } from "@/db/schema"

export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const resetAt = now + windowMs

  try {
    const row = await db.get<{ count: number }>(sql`
      INSERT INTO rate_limits ("key", "count", "reset_at") VALUES (${key}, 1, ${resetAt})
      ON CONFLICT("key") DO UPDATE SET
        "count" = CASE WHEN rate_limits."reset_at" < ${now} THEN 1 ELSE rate_limits."count" + 1 END,
        "reset_at" = CASE WHEN rate_limits."reset_at" < ${now} THEN ${resetAt} ELSE rate_limits."reset_at" END
      RETURNING "count"
    `)

    // ponytail: 1% chance per call to purge expired rows; cron if the table ever grows
    if (Math.random() < 0.01) {
      void db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).catch(() => {})
    }

    return (row?.count ?? 0) <= max
  } catch (err) {
    console.error("[rate-limiter] error:", err)
    return true
  }
}
