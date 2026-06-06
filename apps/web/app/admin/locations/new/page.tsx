import { LocationForm } from "@/features/locations/components/location-form";

export default function NewLocationPage() {
	return (
		<div className="max-w-2xl">
			<h1 className="mb-6 text-3xl font-bold">New Location</h1>

			<LocationForm />
		</div>
	);
}
