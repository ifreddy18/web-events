import { notFound } from "next/navigation";

import { CompetitionForm } from "@/features/competitions/components/competition-form";

import { getCompetition } from "@/features/competitions/queries/get-competition";
import { getDisciplineOptions } from "@/features/competitions/queries/get-discipline-options";
import { getEventEditionOptions } from "@/features/competitions/queries/get-event-edition-options";

type PageProps = Readonly<{
	params: Promise<{
		id: string;
	}>;
}>;

export default async function EditCompetitionPage({ params }: PageProps) {
	const { id } = await params;

	console.log("Competition ID:", id);
	const competition = await getCompetition(id);
	console.log("Competition:", competition);

	if (!competition) {
		notFound();
	}

	const eventEditionOptions = await getEventEditionOptions();

	const disciplineOptions = await getDisciplineOptions();

	return (
		<div className="space-y-6">
			<h1 className="mb-6 text-3xl font-bold">Edit Competition</h1>

			<CompetitionForm
				competitionId={competition.id}
				eventEditionOptions={eventEditionOptions}
				disciplineOptions={disciplineOptions}
				defaultValues={{
					eventEditionId: competition.eventEditionId,

					disciplineId: competition.disciplineId,

					name: competition.name,
					slug: competition.slug,

					description: competition.description ?? "",

					status: competition.status,
				}}
			/>
		</div>
	);
}
