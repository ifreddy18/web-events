import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { AdminBreadcrumbs } from "./admin-breadcrumbs"
import { AdminMobileNavigation } from "./admin-mobile-navigation"
import { AdminNavigationLinks } from "./admin-navigation-links"

/** Persistent chrome for every /admin page. Authorization stays in app/admin/layout.tsx. */
export function AdminShell({ userEmail, children }: { userEmail: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r lg:block">
        <div className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto p-4">
          <span className="px-3 text-lg font-semibold">Admin</span>
          <AdminNavigationLinks />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-3 lg:px-6">
          <AdminMobileNavigation />
          <div className="min-w-0 flex-1">
            <AdminBreadcrumbs />
          </div>
          <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
          <SignOutButton />
        </header>
        <main className="min-w-0 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
