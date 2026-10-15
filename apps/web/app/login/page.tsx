import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/features/auth/components/login-form"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { getSession, hasAdminRole } from "@/server/auth/session"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  const session = await getSession()
  if (session && hasAdminRole(session.user.role) && !session.user.banned) redirect("/admin")

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {session ? (
            <>
              <p role="alert" className="text-sm text-destructive">
                {session.user.email} does not have administrator access.
              </p>
              <SignOutButton />
            </>
          ) : (
            <LoginForm />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
