import Link from "next/link"

export const metadata = { title: "Admin" }

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin panel</h1>
      <ul className="list-disc pl-5 text-sm">
        <li>
          <Link href="/admin/locations" className="underline underline-offset-4">
            Locations
          </Link>
        </li>
        <li>
          <Link href="/admin/organizers" className="underline underline-offset-4">
            Organizers
          </Link>
        </li>
        <li>
          <Link href="/admin/event-series" className="underline underline-offset-4">
            Event series
          </Link>
        </li>
        <li>
          <Link href="/admin/event-editions" className="underline underline-offset-4">
            Event editions
          </Link>
        </li>
      </ul>
    </div>
  )
}
