import { notFound } from "next/navigation";

import { EventEditionForm } from "@/features/event-editions/components/event-edition-form";

import { getEventEditionById } from "@/features/event-editions/queries/get-event-edition-by-id";
import { getEventSeriesOptions } from "@/features/event-editions/queries/get-event-series-options";
import { getLocationOptions } from "@/features/event-editions/queries/get-location-options";

type EditEventEditionPageProps = Readonly<{
	params: Promise<{
		id: string;
	}>;
}>;

export default async function EditEventEditionPage({
	params,
}: EditEventEditionPageProps) {
	const { id } = await params;

	const [eventEdition, eventSeries, locations] = await Promise.all([
		getEventEditionById(id),
		getEventSeriesOptions(),
		getLocationOptions(),
	]);

	if (!eventEdition) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<h1 className="mb-6 text-3xl font-bold">Edit Event Edition</h1>

			<EventEditionForm
				eventEditionId={eventEdition.id}
				defaultValues={{
					eventSeriesId: eventEdition.eventSeriesId,

					locationId: eventEdition.locationId ?? "",

					year: eventEdition.year,

					name: eventEdition.name,

					slug: eventEdition.slug,

					startsAt: eventEdition.startsAt.toISOString().slice(0, 16),

					endsAt: eventEdition.endsAt?.toISOString().slice(0, 16) ?? "",

					registrationOpenAt:
						eventEdition.registrationOpenAt?.toISOString().slice(0, 16) ?? "",

					registrationCloseAt:
						eventEdition.registrationCloseAt?.toISOString().slice(0, 16) ?? "",

					registrationUrl: eventEdition.registrationUrl ?? "",

					resultsUrl: eventEdition.resultsUrl ?? "",

					status: eventEdition.status,
				}}
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
