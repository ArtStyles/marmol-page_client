const LEGACY_WORKSHOP_ROUTE_PATTERN = /^TLR-[A-Z0-9_-]+$/i
const SECURE_WORKSHOP_ROUTE_PATTERN = /^wks_[a-f0-9]{32}$/i

function splitPath(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

export function isWorkshopRouteSegment(segment: string | undefined): boolean {
  if (!segment) return false
  return (
    LEGACY_WORKSHOP_ROUTE_PATTERN.test(segment) ||
    SECURE_WORKSHOP_ROUTE_PATTERN.test(segment)
  )
}

export function extractWorkshopIdFromAdminPath(pathname: string): string | null {
  const segments = splitPath(pathname)
  if (segments[0] !== 'admin') return null
  return isWorkshopRouteSegment(segments[1]) ? segments[1] : null
}

export function normalizeAdminPath(pathname: string): string {
  const segments = splitPath(pathname)
  if (segments[0] !== 'admin') return pathname
  const normalizedSegments = isWorkshopRouteSegment(segments[1])
    ? [segments[0], ...segments.slice(2)]
    : segments

  if (normalizedSegments.length === 0) return '/'
  return `/${normalizedSegments.join('/')}`
}

export function routeWithWorkshop(path: string, workshopId?: string | null): string {
  if (!workshopId || !isWorkshopRouteSegment(workshopId)) return path
  if (path === '/admin') return `/admin/${workshopId}`
  if (!path.startsWith('/admin/')) return path
  const suffix = path.slice('/admin/'.length)
  return `/admin/${workshopId}/${suffix}`
}

export function isAdminRouteActive(href: string, pathname: string): boolean {
  const normalizedHref = normalizeAdminPath(href)
  const normalizedPathname = normalizeAdminPath(pathname)

  if (normalizedHref === '/admin') {
    return normalizedPathname === '/admin'
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  )
}
