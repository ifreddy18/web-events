import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";

import { getEventSeries } from "@/features/event-series/queries/get-event-series";
import { EventSeriesTable } from "@/features/event-series/components/event-series-table";

export default async function EventSeriesPage() {
	const eventSeries = await getEventSeries();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Event Series"
				action={
					<Button asChild>
						<Link href="/admin/event-series/new">New Event Series</Link>
					</Button>
				}
			></PageHeader>

			<EventSeriesTable eventSeries={eventSeries} />
		</div>
	);
}
