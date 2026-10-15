import { notFound } from "next/navigation"
import { EventSeriesForm } from "@/features/event-series/components/event-series-form"
import { getEventSeries, listDisciplineOptions, listOrganizerOptions } from "@/features/event-series/queries"

export const metadata = { title: "Edit series" }

export default async function EditEventSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const series = await getEventSeries((await params).id)
  if (!series) notFound()
  const [disciplines, organizers] = await Promise.all([listDisciplineOptions(), listOrganizerOptions()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit series</h1>
      <EventSeriesForm
        id={series.id}
        disciplines={disciplines}
        organizers={organizers.map((o) => ({ id: o.id, label: o.name }))}
        initial={{
          name: series.name,
          slug: series.slug,
          disciplineId: series.disciplineId,
          description: series.description ?? "",
          officialWebsite: series.officialWebsite ?? "",
          instagram: series.instagram ?? "",
          status: series.status,
          primaryOrganizerId: series.primaryOrganizerId,
          coOrganizerIds: series.coOrganizerIds,
        }}
      />
    </div>
  )
}
