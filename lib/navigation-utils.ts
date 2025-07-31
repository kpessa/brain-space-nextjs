/**
 * Utility function to determine if a navigation item is active
 * Handles exact matches and sub-routes
 */
export function isNavItemActive(pathname: string, itemPath: string): boolean {
  // Handle special cases
  if (itemPath === '#more' || !pathname || !itemPath) {
    return false
  }
  
  // Normalize paths by removing trailing slashes
  const normalizedPathname = pathname.replace(/\/$/, '')
  const normalizedItemPath = itemPath.replace(/\/$/, '')
  
  // Check for exact match
  if (normalizedPathname === normalizedItemPath) {
    return true
  }
  
  // Check if current path is a sub-route of the item
  // e.g., /journal/new should match /journal
  return normalizedPathname.startsWith(normalizedItemPath + '/')
}