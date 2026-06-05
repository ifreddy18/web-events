import Link from "next/link";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBadge } from "@/components/admin/status-badge";

type EventSeriesTableProps = Readonly<{
	eventSeries: {
		id: string;
		name: string;
		status: string;

		organizer: {
			name: string;
		};

		discipline: {
			name: string;
		};
	}[];
}>;

export function EventSeriesTable({ eventSeries }: EventSeriesTableProps) {
	if (eventSeries.length === 0) {
		return (
			<EmptyState
				title="No event series yet"
				description="Create your first event series."
			/>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>

					<TableHead>Organizer</TableHead>

					<TableHead>Discipline</TableHead>

					<TableHead>Status</TableHead>

					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{eventSeries.map((series) => (
					<TableRow key={series.id}>
						<TableCell className="font-medium">{series.name}</TableCell>

						<TableCell>{series.organizer.name}</TableCell>

						<TableCell>{series.discipline.name}</TableCell>

						<TableCell>
							<StatusBadge status={series.status} />
						</TableCell>

						<TableCell>
							<div className="flex gap-2">
								<Link
									href={`/admin/event-series/${series.id}/edit`}
									className="text-sm underline"
								>
									Edit
								</Link>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
