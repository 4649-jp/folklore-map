/**
 * Input sanitization utilities
 * Provides XSS protection and safe HTML handling
 */

/**
 * HTML special characters that need escaping
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * Use this for user-generated content that will be rendered as HTML
 *
 * @param text - The text to escape
 * @returns Escaped text safe for HTML rendering
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strip all HTML tags from a string
 * Useful for converting HTML to plain text
 *
 * @param html - The HTML string to strip
 * @returns Plain text without HTML tags
 *
 * @example
 * stripHtml('<p>Hello <b>World</b></p>')
 * // Returns: 'Hello World'
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string by stripping HTML and escaping special characters
 * This is the safest option for untrusted user input
 *
 * @param text - The text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  return escapeHtml(stripHtml(text));
}

/**
 * Validate and sanitize a URL
 * Only allows http, https, and mailto protocols
 *
 * @param url - The URL to validate
 * @returns Sanitized URL or null if invalid
 *
 * @example
 * sanitizeUrl('javascript:alert("XSS")')
 * // Returns: null
 *
 * sanitizeUrl('https://example.com')
 * // Returns: 'https://example.com'
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow safe protocols
    const allowedProtocols = ["http:", "https:", "mailto:"];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 * Useful for preventing excessively long input
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 200)
 * @param suffix - Suffix to add if truncated (default: '...')
 * @returns Truncated text
 */
export function truncateText(
  text: string,
  maxLength = 200,
  suffix = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Remove null bytes from a string
 * Null bytes can cause security issues in some contexts
 *
 * @param text - The text to clean
 * @returns Text without null bytes
 */
export function removeNullBytes(text: string): string {
  return text.replace(/\0/g, "");
}

/**
 * Normalize whitespace in a string
 * Replaces multiple spaces, tabs, newlines with single space
 * Trims leading and trailing whitespace
 *
 * @param text - The text to normalize
 * @returns Normalized text
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Comprehensive sanitization for user-generated text content
 * Applies multiple sanitization steps:
 * - Removes null bytes
 * - Strips HTML tags
 * - Escapes special characters
 * - Normalizes whitespace
 * - Truncates to max length
 *
 * @param text - The text to sanitize
 * @param maxLength - Maximum length (default: 10000)
 * @returns Fully sanitized text
 */
export function sanitizeUserContent(
  text: string,
  maxLength = 10000
): string {
  let sanitized = removeNullBytes(text);
  sanitized = stripHtml(sanitized);
  sanitized = escapeHtml(sanitized);
  sanitized = normalizeWhitespace(sanitized);

  if (sanitized.length > maxLength) {
    sanitized = truncateText(sanitized, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize an object's string values
 * Useful for sanitizing form data or JSON payloads
 *
 * @param obj - Object with string values
 * @param fields - Array of field names to sanitize (if not provided, sanitizes all string fields)
 * @returns New object with sanitized values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields?: (keyof T)[]
): T {
  const result = { ...obj };
  const fieldsToSanitize = fields || (Object.keys(obj) as (keyof T)[]);

  for (const field of fieldsToSanitize) {
    const value = result[field];
    if (typeof value === "string") {
      result[field] = sanitizeUserContent(value) as T[keyof T];
    }
  }

  return result;
}

/**
 * Check if a string contains potential XSS patterns
 * This is a basic check and should not be relied upon as the sole defense
 *
 * @param text - The text to check
 * @returns true if suspicious patterns are found
 */
export function containsXssPatterns(text: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(text));
}

/**
 * Sanitize filename to prevent directory traversal attacks
 * Removes path separators and special characters
 *
 * @param filename - The filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  let safe = filename.replace(/[/\\?%*:|"<>]/g, "-");

  // Remove leading dots to prevent hidden files
  safe = safe.replace(/^\.+/, "");

  // Remove null bytes
  safe = removeNullBytes(safe);

  // Limit length
  safe = truncateText(safe, 255, "");

  return safe || "unnamed";
}
