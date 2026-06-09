import Link from "next/link";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";

import { DeleteEventEditionButton } from "./delete-event-edition-button";

type EventEdition = {
	id: string;
	name: string;
	year: number;
	status: string;

	eventSeries: {
		name: string;
	};

	location: {
		country: string;
		city: string | null;
		venueName: string | null;
	} | null;
};

type EventEditionsTableProps = Readonly<{
	eventEditions: EventEdition[];
}>;

export function EventEditionsTable({ eventEditions }: EventEditionsTableProps) {
	if (eventEditions.length === 0) {
		return (
			<div className="rounded-lg border p-10 text-center">
				<h3 className="font-semibold">No event editions yet</h3>

				<p className="mt-2 text-sm text-muted-foreground">
					Create your first event edition.
				</p>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Series</TableHead>
					<TableHead>Location</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{eventEditions.map((eventEdition) => (
					<TableRow key={eventEdition.id}>
						<TableCell className="font-medium">{eventEdition.name}</TableCell>

						<TableCell>{eventEdition.eventSeries.name}</TableCell>

						<TableCell>
							{eventEdition.location
								? [
										eventEdition.location.venueName,
										eventEdition.location.city,
										eventEdition.location.country,
									]
										.filter(Boolean)
										.join(", ")
								: "-"}
						</TableCell>

						<TableCell>
							<StatusBadge status={eventEdition.status} />
						</TableCell>

						<TableCell>
							<div className="flex gap-2">
								<Link
									href={`/admin/event-editions/${eventEdition.id}/edit`}
									className="text-sm underline"
								>
									Edit
								</Link>

								<DeleteEventEditionButton eventEditionId={eventEdition.id} />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
