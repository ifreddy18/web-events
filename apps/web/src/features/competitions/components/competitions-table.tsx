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

import { DeleteCompetitionButton } from "./delete-competition-button";

type Competition = {
	id: string;

	name: string;

	status: string;

	eventEdition: {
		name: string;
	};

	discipline: {
		name: string;
	};
};

type CompetitionsTableProps = Readonly<{
	competitions: Competition[];
}>;

export function CompetitionsTable({ competitions }: CompetitionsTableProps) {
	if (competitions.length === 0) {
		return (
			<div className="rounded-lg border p-10 text-center">
				<h3 className="font-semibold">No competitions yet</h3>

				<p className="mt-2 text-sm text-muted-foreground">
					Create your first competition.
				</p>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Discipline</TableHead>
					<TableHead>Event Edition</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{competitions.map((competition) => (
					<TableRow key={competition.id}>
						<TableCell className="font-medium">{competition.name}</TableCell>

						<TableCell>{competition.discipline.name}</TableCell>

						<TableCell>{competition.eventEdition.name}</TableCell>

						<TableCell>
							<StatusBadge status={competition.status} />
						</TableCell>

						<TableCell>
							<div className="flex gap-2">
								<Link
									href={`/admin/competitions/${competition.id}/edit`}
									className="text-sm underline"
								>
									Edit
								</Link>

								<DeleteCompetitionButton competitionId={competition.id} />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
