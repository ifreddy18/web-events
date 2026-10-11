import { CompetitionForm } from "@/features/competitions/components/competition-form";

import { getEventEditionOptions } from "@/features/competitions/queries/get-event-edition-options";
import { getDisciplineOptions } from "@/features/competitions/queries/get-discipline-options";

export default async function NewCompetitionPage() {
	const [eventEditionOptions, disciplineOptions] = await Promise.all([
		getEventEditionOptions(),
		getDisciplineOptions(),
	]);

	return (
		<div className="space-y-6">
			<h1 className="mb-6 text-3xl font-bold">Create Event Edition</h1>

			<CompetitionForm
				eventEditionOptions={eventEditionOptions}
				disciplineOptions={disciplineOptions}
			/>
		</div>
	);
}
