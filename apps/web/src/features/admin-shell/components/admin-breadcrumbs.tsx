"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { buildAdminBreadcrumbs } from "../navigation"

export function AdminBreadcrumbs() {
  const breadcrumbs = buildAdminBreadcrumbs(usePathname())
  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => {
          const isCurrent = index === breadcrumbs.length - 1
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <li aria-hidden>/</li>}
              <li className="truncate">
                {crumb.href && !isCurrent ? (
                  <Link href={crumb.href} className="underline-offset-4 hover:text-foreground hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={isCurrent ? "page" : undefined} className={isCurrent ? "font-medium text-foreground" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
