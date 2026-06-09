/**
 * Validates a candidate redirect path as a safe internal destination.
 *
 * Rules (each exists to block a specific attack class):
 *  1. Must be a non-empty string            — rejects null/undefined/empty
 *  2. Must start with "/"                   — rejects absolute URLs (https://…)
 *  3. Must NOT start with "//"             — rejects protocol-relative URLs (//evil.com)
 *     that browsers treat as off-site after the origin prefix is prepended
 *  4. Must NOT contain a backslash         — rejects Windows-style paths and
 *     certain encoded variants (\x2f) that some parsers normalise to /
 *  5. Must NOT start with whitespace or a  — rejects leading-space/control-char
 *     control character (codePoint < 0x20)   tricks used to bypass prefix checks
 *
 * Returns `raw` if all checks pass, otherwise returns `fallback` (default: /vault).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = '/vault'
): string {
  if (
    typeof raw === 'string' &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('\\') &&
    raw.charCodeAt(0) === 0x2f && // leading char is literally '/'
    (raw.length === 1 || raw.charCodeAt(1) >= 0x21) // second char not whitespace/control
  ) {
    return raw
  }
  return fallback
}
