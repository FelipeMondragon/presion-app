const limits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = limits.get(key)
  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// ponytail: global Map cleanup every 5 min, per-IP Redis if this app gets real traffic
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of limits) if (now > v.resetAt) limits.delete(k)
}, 300_000)
