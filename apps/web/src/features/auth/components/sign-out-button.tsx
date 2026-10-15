"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { authClient } from "../auth-client"

export function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut()
        router.replace("/login")
        router.refresh()
      }}
    >
      Sign out
    </Button>
  )
}
