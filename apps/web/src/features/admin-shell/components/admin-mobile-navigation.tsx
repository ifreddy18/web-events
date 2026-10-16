"use client"

import { MenuIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AdminNavigationLinks } from "./admin-navigation-links"

export function AdminMobileNavigation() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[85vw]">
        <SheetHeader>
          <SheetTitle>Admin</SheetTitle>
          <SheetDescription className="sr-only">Navigate between admin modules</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-3 pb-4">
          <AdminNavigationLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
