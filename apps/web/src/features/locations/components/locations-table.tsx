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
import { DeleteLocationButton } from "./delete-location-button";

type LocationsTableProps = Readonly<{
	locations: {
		id: string;
		country: string;
		city: string | null;
		venueName: string | null;
	}[];
}>;

export function LocationsTable({ locations }: LocationsTableProps) {
	if (locations.length === 0) {
		return (
			<EmptyState
				title="No locations yet"
				description="Create your first location."
			/>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Venue</TableHead>
					<TableHead>Country</TableHead>
					<TableHead>City</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{locations.map((location) => (
					<TableRow key={location.id}>
						<TableCell className="font-medium">
							{location.venueName ?? "-"}
						</TableCell>

						<TableCell>{location.country}</TableCell>

						<TableCell>{location.city ?? "-"}</TableCell>

						<TableCell>
							<div className="flex gap-2">
								<Link
									href={`/admin/locations/${location.id}/edit`}
									className="text-sm underline"
								>
									Edit
								</Link>

								<DeleteLocationButton locationId={location.id} />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
