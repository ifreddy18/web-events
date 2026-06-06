import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { LocationsTable } from "@/features/locations/components/locations-table";
import { getLocations } from "@/features/locations/queries/get-locations";

export default async function LocationsPage() {
	const locations = await getLocations();

	return (
		<div>
			<PageHeader
				title="Locations"
				action={{
					label: "Create Location",
					href: "/admin/locations/new",
				}}
			/>

			<Card>
				<CardContent className="pt-6">
					<LocationsTable locations={locations} />
				</CardContent>
			</Card>
		</div>
	);
}
