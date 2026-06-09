import { EventEditionForm } from "@/features/event-editions/components/event-edition-form";

import { getEventSeriesOptions } from "@/features/event-editions/queries/get-event-series-options";
import { getLocationOptions } from "@/features/event-editions/queries/get-location-options";

export default async function NewEventEditionPage() {
	const [eventSeries, locations] = await Promise.all([
		getEventSeriesOptions(),
		getLocationOptions(),
	]);

	return (
		<div className="space-y-6">
			<h1 className="mb-6 text-3xl font-bold">Create Event Edition</h1>

			<EventEditionForm
				eventSeriesOptions={eventSeries.map((item) => ({
					value: item.id,
					label: item.name,
				}))}
				locationOptions={locations.map((item) => ({
					value: item.id,
					label: [item.venueName, item.city, item.country]
						.filter(Boolean)
						.join(", "),
				}))}
			/>
		</div>
	);
}
