export const metadata = { title: "Admin" }

export default function AdminPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Manage events, competitions, organizers and locations from the sidebar.
      </p>
    </div>
  )
}
