import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import Link from "next/link";

import { DeleteOrganizerButton } from "./delete-organizer-button";

interface Organizer {
	id: string;
	name: string;
	slug: string;
	website: string | null;
	instagram: string | null;
}

type OrganizersTableProps = Readonly<{
	organizers: Organizer[];
}>;

export function OrganizersTable({ organizers }: OrganizersTableProps) {
	if (organizers.length === 0) {
		return (
			<div className="rounded-lg border p-10 text-center">
				<h3 className="font-semibold">No organizers yet</h3>

				<p className="mt-2 text-sm text-muted-foreground">
					Create your first organizer.
				</p>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Instagram</TableHead>
					<TableHead>Website</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{organizers.map((organizer) => (
					<TableRow key={organizer.id}>
						<TableCell className="font-medium">{organizer.name}</TableCell>

						<TableCell>{organizer.instagram ?? "-"}</TableCell>

						<TableCell>{organizer.website ?? "-"}</TableCell>
						<TableCell>
							<div className="flex gap-2">
								<Link
									href={`/admin/organizers/${organizer.id}/edit`}
									className="text-sm underline"
								>
									Edit
								</Link>

								<DeleteOrganizerButton organizerId={organizer.id} />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
