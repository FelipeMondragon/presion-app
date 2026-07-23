export function getClientIp(request: Request | undefined): string {
  const forwarded = request?.headers?.get("x-forwarded-for")
  return forwarded ? forwarded.split(",").pop()?.trim() ?? "0.0.0.0" : "0.0.0.0"
}
