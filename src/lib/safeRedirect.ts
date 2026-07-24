/** Accept only same-origin path redirects. */
export function safeInternalRedirect(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f]/.test(candidate)
  ) {
    return fallback;
  }
  return candidate;
}
