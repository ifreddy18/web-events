import { redirect } from "next/navigation"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { getSession, hasAdminRole } from "@/server/auth/session"

// Page-level gate for navigation. It is NOT the authorization boundary:
// layouts do not re-run on every request, so every Server Action and
// Route Handler must call requireAdmin() itself.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.user.banned || !hasAdminRole(session.user.role)) redirect("/login")

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Admin</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
