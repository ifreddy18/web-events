import { OrganizerForm } from "@/features/organizers/components/organizer-form";

export default function NewOrganizerPage() {
	return (
		<div className="max-w-2xl">
			<h1 className="mb-6 text-3xl font-bold">Create Organizer</h1>

			<OrganizerForm />
		</div>
	);
}
