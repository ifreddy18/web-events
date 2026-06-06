import { PageHeader } from "@/components/admin/page-header";

import { getEventSeries } from "@/features/event-series/queries/get-event-series";
import { EventSeriesTable } from "@/features/event-series/components/event-series-table";

export default async function EventSeriesPage() {
	const eventSeries = await getEventSeries();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Event Series"
				action={{
					label: "New Event Series",
					href: "/admin/event-series/new",
				}}
			></PageHeader>

			<EventSeriesTable eventSeries={eventSeries} />
		</div>
	);
}
