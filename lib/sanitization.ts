/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Remove HTML tags from a string
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return input.replace(/[&<>"'/]/g, char => map[char] || char)
}

/**
 * Sanitize a string for safe display
 */
export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input
    .trim()
    .replace(/[^\w\s.,!?@#$%^&*()_+=\-[\]{}|;:'",.<>/?]/g, '') // Remove most special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

/**
 * Sanitize user input for Firebase
 */
export function sanitizeForFirebase(input: any): any {
  if (input === null || input === undefined) {
    return input
  }
  
  if (typeof input === 'string') {
    // Remove null bytes and control characters
    return input
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeForFirebase)
  }
  
  if (typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      // Skip keys with dots, slashes, or other Firebase-invalid characters
      const sanitizedKey = key.replace(/[.#$[\]/]/g, '_')
      sanitized[sanitizedKey] = sanitizeForFirebase(value)
    }
    return sanitized
  }
  
  return input
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._-]/g, '')
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    // Prevent javascript: and data: URLs
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_') // Prevent directory traversal
    .substring(0, 255) // Max file name length
}

/**
 * Validate and sanitize phone numbers
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+\-() ]/g, '')
}

/**
 * Create a slug from a string
 */
export function createSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
}

/**
 * Sanitize search queries
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and dashes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 200) // Limit length
}

/**
 * Validate and sanitize hex color codes
 */
export function sanitizeHexColor(color: string): string | null {
  const cleaned = color.replace(/[^a-fA-F0-9#]/g, '')
  
  if (/^#?[a-fA-F0-9]{3}$/.test(cleaned)) {
    return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
  }
  
  if (/^#?[a-fA-F0-9]{6}$/.test(cleaned)) {
    return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
  }
  
  return null
}

/**
 * Remove non-printable characters
 */
export function removeNonPrintable(input: string): string {
  // Keep only printable ASCII and common Unicode
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
}

/**
 * Truncate string with ellipsis
 */
export function truncate(input: string, maxLength: number, suffix: string = '...'): string {
  if (input.length <= maxLength) return input
  
  const truncateLength = maxLength - suffix.length
  if (truncateLength <= 0) return suffix
  
  return input.substring(0, truncateLength) + suffix
}