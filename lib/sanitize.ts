import DOMPurify from 'isomorphic-dompurify'

/**
 * Configuration for different sanitization contexts
 */
const SANITIZE_CONFIGS = {
  // For basic HTML content (default)
  basic: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  },
  
  // For markdown-converted HTML
  markdown: {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
  },
  
  // For rich text editor content
  richText: {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
  },
  
  // Strict mode - text only
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  },
} as const

type SanitizeConfig = keyof typeof SANITIZE_CONFIGS

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @param config - The sanitization configuration to use
 * @returns The sanitized HTML string
 */
export function sanitizeHtml(dirty: string, config: SanitizeConfig = 'basic'): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIGS[config])
}

/**
 * Converts markdown to HTML and sanitizes it
 * @param markdown - The markdown string to convert
 * @returns The sanitized HTML string
 */
export function markdownToSafeHtml(markdown: string): string {
  // Basic markdown to HTML conversion
  const html = markdown
    // Headers
    .replace(/^### (.*?)$/gm, '<h3 class="font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="font-bold text-lg mt-4 mb-2">$1</h1>')
    
    // Emphasis
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Lists
    .replace(/^\* (.*)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)\n(?!<li>)/gs, '<ul>$1</ul>\n')
    
    // Code blocks
    .replace(/```([^`]*)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/^/, '<p class="mb-2">')
    .replace(/$/, '</p>')
  
  // Sanitize the converted HTML
  return sanitizeHtml(html, 'markdown')
}

/**
 * Strips all HTML tags from a string
 * @param html - The HTML string to strip
 * @returns The plain text string
 */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, 'strict')
}

/**
 * Validates and sanitizes user input for safe storage
 * @param input - The user input to validate
 * @param maxLength - Maximum allowed length
 * @returns The sanitized input
 */
export function sanitizeUserInput(input: string, maxLength: number = 10000): string {
  // Trim and limit length
  const trimmed = input.trim().slice(0, maxLength)
  
  // Remove any HTML tags
  return stripHtml(trimmed)
}

/**
 * Creates a safe HTML renderer component props
 * @param html - The HTML to render
 * @param config - The sanitization configuration
 * @returns Props object for dangerouslySetInnerHTML
 */
export function getSafeHtmlProps(html: string, config: SanitizeConfig = 'basic') {
  return {
    dangerouslySetInnerHTML: {
      __html: sanitizeHtml(html, config)
    }
  }
}