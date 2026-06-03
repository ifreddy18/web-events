import { notFound } from "next/navigation";

import { OrganizerForm } from "@/features/organizers/components/organizer-form";
import { getOrganizer } from "@/features/organizers/queries/get-organizer";

type EditOrganizerPageProps = Readonly<{
	params: Promise<{
		id: string;
	}>;
}>;

export default async function EditOrganizerPage({
	params,
}: EditOrganizerPageProps) {
	const { id } = await params;

	const organizer = await getOrganizer(id);

	if (!organizer) {
		notFound();
	}

	return (
		<div className="max-w-2xl">
			<h1 className="mb-6 text-3xl font-bold">Edit Organizer</h1>

			<OrganizerForm
				organizerId={organizer.id}
				defaultValues={{
					name: organizer.name,
					slug: organizer.slug,
					description: organizer.description ?? "",
					website: organizer.website ?? "",
					instagram: organizer.instagram ?? "",
					logoUrl: organizer.logoUrl ?? "",
				}}
			/>
		</div>
	);
}
