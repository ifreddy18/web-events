import { Building2, Camera, CalendarRange, Flag, LayoutDashboard, MapPin, Trophy, type LucideIcon } from "lucide-react"

export type AdminNavigationItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type AdminNavigationSection = {
  /** null for the dashboard, which sits above the labelled sections. */
  label: string | null
  items: AdminNavigationItem[]
}

export const DASHBOARD_HREF = "/admin"

/** Single source of truth for the sidebar, the mobile drawer and the breadcrumbs. Add a module here once it is finished. */
export const ADMIN_NAVIGATION: AdminNavigationSection[] = [
  { label: null, items: [{ label: "Dashboard", href: DASHBOARD_HREF, icon: LayoutDashboard }] },
  {
    label: "Events",
    items: [
      { label: "Event Series", href: "/admin/event-series", icon: CalendarRange },
      { label: "Event Editions", href: "/admin/event-editions", icon: Flag },
      { label: "Competitions", href: "/admin/competitions", icon: Trophy },
    ],
  },
  {
    label: "Catalogs",
    items: [
      { label: "Organizers", href: "/admin/organizers", icon: Building2 },
      { label: "Locations", href: "/admin/locations", icon: MapPin },
      { label: "Photographers", href: "/admin/photographers", icon: Camera },
    ],
  },
]

/** An item is active on its own page and on every nested page (new, edit). The dashboard only matches exactly. */
export function isNavigationItemActive(item: AdminNavigationItem, pathname: string) {
  if (item.href === DASHBOARD_HREF) return pathname === DASHBOARD_HREF
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function findActiveNavigation(pathname: string) {
  for (const section of ADMIN_NAVIGATION) {
    const item = section.items.find((candidate) => isNavigationItemActive(candidate, pathname))
    if (item) return { section, item }
  }
  return null
}

export type AdminBreadcrumb = {
  label: string
  /** Absent for the current page and for section labels, which have no page of their own. */
  href?: string
}

const ACTION_LABELS: Record<string, string> = { new: "New", edit: "Edit" }

/**
 * Derives breadcrumbs from the navigation config: [section >] module [> New | Edit].
 * Edit URLs are /<module>/<id>/edit; the id is not shown because the page title already names the record.
 */
export function buildAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  const active = findActiveNavigation(pathname)
  if (!active) return []
  const { section, item } = active

  const remainder = pathname.slice(item.href.length).split("/").filter(Boolean)
  const action = ACTION_LABELS[remainder[remainder.length - 1] ?? ""]

  const crumbs: AdminBreadcrumb[] = []
  if (section.label) crumbs.push({ label: section.label })
  crumbs.push(action ? { label: item.label, href: item.href } : { label: item.label })
  if (action) crumbs.push({ label: action })
  return crumbs
}
