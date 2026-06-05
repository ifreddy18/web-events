import { notFound } from "next/navigation";

import { EventSeriesForm } from "@/features/event-series/components/event-series-form";

import { getEventSeriesById } from "@/features/event-series/queries/get-event-series-by-id";
import { getOrganizerOptions } from "@/features/event-series/queries/get-organizer-options";
import { getDisciplineOptions } from "@/features/event-series/queries/get-discipline-options";

type Props = Readonly<{
	params: Promise<{
		id: string;
	}>;
}>;

export default async function EditEventSeriesPage({ params }: Props) {
	const { id } = await params;

	const [eventSeries, organizers, disciplines] = await Promise.all([
		getEventSeriesById(id),
		getOrganizerOptions(),
		getDisciplineOptions(),
	]);

	if (!eventSeries) {
		notFound();
	}

	return (
		<div className="max-w-2xl">
			<h1 className="mb-6 text-3xl font-bold">Edit Event Series</h1>

			<EventSeriesForm
				eventSeriesId={eventSeries.id}
				organizers={organizers}
				disciplines={disciplines}
				defaultValues={{
					organizerId: eventSeries.organizerId,

					disciplineId: eventSeries.disciplineId,

					name: eventSeries.name,

					slug: eventSeries.slug,

					description: eventSeries.description ?? "",

					officialWebsite: eventSeries.officialWebsite ?? "",

					instagram: eventSeries.instagram ?? "",

					status: eventSeries.status,
				}}
			/>
		</div>
	);
}
