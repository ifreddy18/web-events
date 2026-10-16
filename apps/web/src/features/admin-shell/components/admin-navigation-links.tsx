"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ADMIN_NAVIGATION, findActiveNavigation, isNavigationItemActive } from "../navigation"

/** Shared by the desktop sidebar and the mobile drawer. `onNavigate` lets the drawer close itself. */
export function AdminNavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const activeSection = findActiveNavigation(pathname)?.section

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {ADMIN_NAVIGATION.map((section) => (
        <div key={section.label ?? "root"} className="flex flex-col gap-1">
          {section.label && (
            <p
              className={cn(
                "px-3 text-xs font-semibold uppercase tracking-wide",
                section === activeSection ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active = isNavigationItemActive(item, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center lg:min-h-10 gap-2 rounded-md px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
