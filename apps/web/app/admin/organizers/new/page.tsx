import { OrganizerForm } from "@/features/organizers/components/organizer-form"

export const metadata = { title: "New organizer" }

export default function NewOrganizerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New organizer</h1>
      <OrganizerForm />
    </div>
  )
}
