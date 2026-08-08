export function getClientIp(request: Request | undefined): string {
  if (!request) return "0.0.0.0"
  const vercel = request.headers.get("x-vercel-forwarded-for")
  if (vercel) return vercel.trim()
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded ? forwarded.split(",")[0]?.trim() ?? "0.0.0.0" : "0.0.0.0"
}
