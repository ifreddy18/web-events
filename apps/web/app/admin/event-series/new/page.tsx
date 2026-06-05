import { EventSeriesForm } from "@/features/event-series/components/event-series-form";

import { getDisciplineOptions } from "@/features/event-series/queries/get-discipline-options";
import { getOrganizerOptions } from "@/features/event-series/queries/get-organizer-options";

export default async function NewEventSeriesPage() {
	const [organizers, disciplines] = await Promise.all([
		getOrganizerOptions(),
		getDisciplineOptions(),
	]);

	return (
		<div className="max-w-2xl">
			<h1 className="mb-6 text-3xl font-bold">Create Event Series</h1>

			<EventSeriesForm organizers={organizers} disciplines={disciplines} />
		</div>
	);
}
