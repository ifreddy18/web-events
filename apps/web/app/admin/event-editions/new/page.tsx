import { EventEditionForm } from "@/features/event-editions/components/event-edition-form"
import { listLocationOptions, listOrganizerOptions, listSeriesOptions } from "@/features/event-editions/queries"

export const metadata = { title: "New edition" }

export default async function NewEventEditionPage() {
  const [series, locations, organizers] = await Promise.all([listSeriesOptions(), listLocationOptions(), listOrganizerOptions()])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New edition</h1>
      <EventEditionForm
        series={series}
        locations={locations}
        organizers={organizers.map((o) => ({ id: o.id, label: o.name }))}
        initial={{ year: String(new Date().getFullYear()) }}
      />
    </div>
  )
}
