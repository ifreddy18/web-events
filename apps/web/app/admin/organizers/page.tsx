import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { OrganizersTable } from "@/features/organizers/components/organizers-table";
import { getOrganizers } from "@/features/organizers/queries/get-organizers";

export default async function OrganizersPage() {
	const organizers = await getOrganizers();

	return (
		<div>
			<PageHeader
				title="Organizers"
				action={
					<Button asChild>
						<Link href="/admin/organizers/new">Create Organizer</Link>
					</Button>
				}
			></PageHeader>

			<Card>
				<CardContent className="pt-6">
					<OrganizersTable organizers={organizers} />
				</CardContent>
			</Card>
		</div>
	);
}
