/**
 * Production log boundary.
 *
 * mysql2 errors can contain `sql`, parameter values and server messages, while
 * provider errors can contain request/response bodies. Application code often
 * passes those objects to console.error/warn. In production, keep the first
 * static context string and a correlation ID, and discard every raw argument.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  const safeContext = (value: unknown, fallback: string) => {
    if (typeof value !== "string") return fallback;
    // Context labels in this codebase end with error/failed/unavailable. Avoid
    // logging arbitrary long strings that may contain provider or customer data.
    const compact = value.replace(/[\r\n\t]+/g, " ").trim();
    if (!compact || compact.length > 160) return fallback;
    return compact;
  };
  const eventId = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  console.error = (...args: unknown[]) => {
    originalError(JSON.stringify({ level: "error", eventId: eventId(), context: safeContext(args[0], "Server operation failed") }));
  };
  console.warn = (...args: unknown[]) => {
    originalWarn(JSON.stringify({ level: "warn", eventId: eventId(), context: safeContext(args[0], "Server warning") }));
  };
}
