import { describe, expect, it } from "vitest"
import { ADMIN_NAVIGATION, buildAdminBreadcrumbs, findActiveNavigation, isNavigationItemActive } from "@/features/admin-shell/navigation"

const allItems = ADMIN_NAVIGATION.flatMap((section) => section.items)
const itemFor = (href: string) => allItems.find((item) => item.href === href)!

describe("admin navigation configuration", () => {
  it("lists every finished module exactly once, grouped as Events and Catalogs", () => {
    expect(ADMIN_NAVIGATION.map((section) => [section.label, section.items.map((item) => item.label)])).toEqual([
      [null, ["Dashboard"]],
      ["Events", ["Event Series", "Event Editions", "Competitions"]],
      ["Catalogs", ["Organizers", "Locations", "Photographers"]],
    ])
    expect(new Set(allItems.map((item) => item.href)).size).toBe(allItems.length)
  })
})

describe("active route detection", () => {
  it("matches the dashboard only on /admin", () => {
    expect(isNavigationItemActive(itemFor("/admin"), "/admin")).toBe(true)
    expect(isNavigationItemActive(itemFor("/admin"), "/admin/locations")).toBe(false)
  })

  it("keeps a module active on its create and edit pages", () => {
    const editions = itemFor("/admin/event-editions")
    expect(isNavigationItemActive(editions, "/admin/event-editions")).toBe(true)
    expect(isNavigationItemActive(editions, "/admin/event-editions/new")).toBe(true)
    expect(isNavigationItemActive(editions, "/admin/event-editions/abc-123/edit")).toBe(true)
  })

  it("does not confuse modules that share a path prefix", () => {
    expect(isNavigationItemActive(itemFor("/admin/event-series"), "/admin/event-series-archive")).toBe(false)
    expect(findActiveNavigation("/admin/event-editions/new")?.item.label).toBe("Event Editions")
  })

  it("finds the parent section of the active item", () => {
    expect(findActiveNavigation("/admin/locations/x/edit")?.section.label).toBe("Catalogs")
    expect(findActiveNavigation("/admin/unknown")).toBeNull()
  })
})

describe("breadcrumb generation", () => {
  it("shows only Dashboard on the dashboard", () => {
    expect(buildAdminBreadcrumbs("/admin")).toEqual([{ label: "Dashboard" }])
  })

  it("shows section and module on a list page, without links to the current page", () => {
    expect(buildAdminBreadcrumbs("/admin/event-editions")).toEqual([{ label: "Events" }, { label: "Event Editions" }])
  })

  it("adds New for create pages and links back to the module", () => {
    expect(buildAdminBreadcrumbs("/admin/event-editions/new")).toEqual([
      { label: "Events" },
      { label: "Event Editions", href: "/admin/event-editions" },
      { label: "New" },
    ])
  })

  it("adds Edit for edit pages and hides the record id", () => {
    expect(buildAdminBreadcrumbs("/admin/locations/0b1c/edit")).toEqual([
      { label: "Catalogs" },
      { label: "Locations", href: "/admin/locations" },
      { label: "Edit" },
    ])
  })

  it("returns no breadcrumbs outside the configured modules", () => {
    expect(buildAdminBreadcrumbs("/admin/unknown")).toEqual([])
  })
})
