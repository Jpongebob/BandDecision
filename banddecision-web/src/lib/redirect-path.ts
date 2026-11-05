// Normalize user-supplied return paths without permitting protocol-relative/backslash redirects.
export function safeInternalPath(raw: string, fallback = '/dashboard'): string {
  if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, 'https://banddecision.invalid');
    if (url.origin !== 'https://banddecision.invalid') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
