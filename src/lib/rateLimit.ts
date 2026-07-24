interface Entry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  beyosRateLimits?: Map<string, Entry>;
};

const entries = globalForRateLimit.beyosRateLimits ?? new Map<string, Entry>();
globalForRateLimit.beyosRateLimits = entries;

export function requestIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = entries.get(key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;

  entry.count += 1;
  entries.set(key, entry);

  // Prevent abandoned keys from growing forever in a long-running process.
  if (entries.size > 10_000) {
    for (const [storedKey, stored] of entries) {
      if (stored.resetAt <= now) entries.delete(storedKey);
    }
  }

  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}
