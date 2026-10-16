import { notFound } from "next/navigation"
import { EventEditionForm } from "@/features/event-editions/components/event-edition-form"
import { EditionCompetitions } from "@/features/competitions/components/edition-competitions"
import { listDisciplineOptions, listEditionCompetitions, listLocationOptions as listCompetitionLocationOptions } from "@/features/competitions/queries"
import { getEventEdition, listLocationOptions, listOrganizerOptions } from "@/features/event-editions/queries"

export const metadata = { title: "Edit edition" }

export default async function EditEventEditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ notice?: string | string[] }>
}) {
  const edition = await getEventEdition((await params).id)
  if (!edition) notFound()
  const [locations, organizers, competitions, disciplines, competitionLocations] = await Promise.all([
    listLocationOptions(),
    listOrganizerOptions(),
    listEditionCompetitions(edition.id),
    listDisciplineOptions(),
    listCompetitionLocationOptions(),
  ])
  const notice = (await searchParams).notice === "created" ? "Edition created. You can now add its competitions below." : null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit edition</h1>
      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}
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
      <EditionCompetitions
        edition={{
          id: edition.id,
          label: `${edition.name} (${edition.year})`,
          startsOn: edition.startsOn,
          endsOn: edition.endsOn,
          locationLabel: competitionLocations.find((location) => location.id === edition.locationId)?.label ?? null,
        }}
        competitions={competitions}
        disciplines={disciplines}
        locations={competitionLocations}
      />
    </div>
  )
}
