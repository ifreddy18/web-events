import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";

import { getEventEditions } from "@/features/event-editions/queries/get-event-editions";

import { EventEditionsTable } from "@/features/event-editions/components/event-editions-table";

export default async function EventEditionsPage() {
	const eventEditions = await getEventEditions();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Event Editions"
				action={{
					label: "New Event Edition",
					href: "/admin/event-editions/new",
				}}
			/>

			<Card>
				<CardContent className="pt-6">
					<EventEditionsTable eventEditions={eventEditions} />
				</CardContent>
			</Card>
		</div>
	);
}
