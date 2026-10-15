import { notFound } from "next/navigation"
import { CompetitionForm } from "@/features/competitions/components/competition-form"
import { getCompetition, listDisciplineOptions, listLocationOptions } from "@/features/competitions/queries"

export const metadata = { title: "Edit competition" }

export default async function EditCompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const competition = await getCompetition((await params).id)
  if (!competition) notFound()
  const [disciplines, locations] = await Promise.all([listDisciplineOptions(), listLocationOptions()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit competition</h1>
      <CompetitionForm
        id={competition.id}
        editions={[competition.edition]}
        disciplines={disciplines}
        locations={locations}
        initialDisciplineId={competition.disciplineId}
        initialMetadata={competition.metadata}
        initial={{
          eventEditionId: competition.edition.id,
          name: competition.name,
          slug: competition.slug,
          description: competition.description ?? "",
          status: competition.status,
          participationType: competition.participationType,
          startsOn: competition.startsOn ?? "",
          endsOn: competition.endsOn ?? "",
          startTime: competition.startTime ?? "",
          endTime: competition.endTime ?? "",
          locationId: competition.locationId ?? "",
          registrationUrl: competition.registrationUrl ?? "",
        }}
      />
    </div>
  )
}
