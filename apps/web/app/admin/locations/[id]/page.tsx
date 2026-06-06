import { notFound } from "next/navigation";

import { LocationForm } from "@/features/locations/components/location-form";

import { getLocationById } from "@/features/locations/queries/get-location-by-id";

type EditLocationPageProps = Readonly<{
	params: Promise<{
		id: string;
	}>;
}>;

export default async function EditLocationPage({
	params,
}: EditLocationPageProps) {
	const { id } = await params;

	const location = await getLocationById(id);

	if (!location) {
		notFound();
	}

	return (
		<div className="max-w-2xl">
			<h1 className="mb-6 text-3xl font-bold">Edit Location</h1>

			<LocationForm
				locationId={location.id}
				defaultValues={{
					country: location.country,
					state: location.state ?? "",
					city: location.city ?? "",
					venueName: location.venueName ?? "",
					address: location.address ?? "",
					slug: location.slug,
					latitude: location.latitude ? Number(location.latitude) : undefined,
					longitude: location.longitude
						? Number(location.longitude)
						: undefined,
				}}
			/>
		</div>
	);
}
