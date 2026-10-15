import { EventSeriesForm } from "@/features/event-series/components/event-series-form"
import { listDisciplineOptions, listOrganizerOptions } from "@/features/event-series/queries"

export const metadata = { title: "New series" }

export default async function NewEventSeriesPage() {
  const [disciplines, organizers] = await Promise.all([listDisciplineOptions(), listOrganizerOptions()])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New series</h1>
      <EventSeriesForm disciplines={disciplines} organizers={organizers.map((o) => ({ id: o.id, label: o.name }))} />
    </div>
  )
}
