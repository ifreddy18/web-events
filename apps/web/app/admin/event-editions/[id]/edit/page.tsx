import { notFound } from "next/navigation"
import { EventEditionForm } from "@/features/event-editions/components/event-edition-form"
import { getEventEdition, listLocationOptions, listOrganizerOptions } from "@/features/event-editions/queries"

export const metadata = { title: "Edit edition" }

export default async function EditEventEditionPage({ params }: { params: Promise<{ id: string }> }) {
  const edition = await getEventEdition((await params).id)
  if (!edition) notFound()
  const [locations, organizers] = await Promise.all([listLocationOptions(), listOrganizerOptions()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit edition</h1>
      <EventEditionForm
        id={edition.id}
        seriesName={edition.seriesName}
        series={[]}
        locations={locations}
        organizers={organizers.map((o) => ({ id: o.id, label: o.name }))}
        initial={{
          name: edition.name,
          slug: edition.slug,
          label: edition.label ?? "",
          year: String(edition.year),
          startsOn: edition.startsOn ?? "",
          endsOn: edition.endsOn ?? "",
          startTime: edition.startTime ?? "",
          endTime: edition.endTime ?? "",
          timeZone: edition.timeZone,
          rescheduledFromOn: edition.rescheduledFromOn ?? "",
          registrationOpenAt: edition.registrationOpenAt ?? "",
          registrationCloseAt: edition.registrationCloseAt ?? "",
          registrationStatus: edition.registrationStatus,
          registrationUrl: edition.registrationUrl ?? "",
          resultsUrl: edition.resultsUrl ?? "",
          publicationStatus: edition.publicationStatus,
          status: edition.status,
          locationId: edition.locationId ?? "",
          primaryOrganizerId: edition.primaryOrganizerId,
          coOrganizerIds: edition.coOrganizerIds,
        }}
      />
    </div>
  )
}
