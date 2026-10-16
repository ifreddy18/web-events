import { redirect } from "next/navigation"
import { AdminShell } from "@/features/admin-shell/components/admin-shell"
import { getSession, hasAdminRole } from "@/server/auth/session"

// Page-level gate for navigation. It is NOT the authorization boundary:
// layouts do not re-run on every request, so every Server Action and
// Route Handler must call requireAdmin() itself.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.user.banned || !hasAdminRole(session.user.role)) redirect("/login")

  return <AdminShell userEmail={session.user.email}>{children}</AdminShell>
}
