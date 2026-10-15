import { notFound } from "next/navigation"
import { OrganizerForm } from "@/features/organizers/components/organizer-form"
import { getOrganizer } from "@/features/organizers/queries"

export const metadata = { title: "Edit organizer" }

export default async function EditOrganizerPage({ params }: { params: Promise<{ id: string }> }) {
  const organizer = await getOrganizer((await params).id)
  if (!organizer) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit organizer</h1>
      <OrganizerForm
        id={organizer.id}
        initial={{
          name: organizer.name,
          slug: organizer.slug,
          description: organizer.description ?? "",
          website: organizer.website ?? "",
          instagram: organizer.instagram ?? "",
          logoUrl: organizer.logoUrl ?? "",
        }}
      />
    </div>
  )
}
