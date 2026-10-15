import { CompetitionForm } from "@/features/competitions/components/competition-form"
import { listDisciplineOptions, listEditionOptions, listLocationOptions } from "@/features/competitions/queries"

export const metadata = { title: "New competition" }

export default async function NewCompetitionPage() {
  const [editions, disciplines, locations] = await Promise.all([listEditionOptions(), listDisciplineOptions(), listLocationOptions()])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New competition</h1>
      <CompetitionForm editions={editions} disciplines={disciplines} locations={locations} />
    </div>
  )
}
