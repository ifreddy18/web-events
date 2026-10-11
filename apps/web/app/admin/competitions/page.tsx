import { Card, CardContent } from "@/components/ui/card";

import { PageHeader } from "@/components/admin/page-header";

import { getCompetitions } from "@/features/competitions/queries/get-competitions";

import { CompetitionsTable } from "@/features/competitions/components/competitions-table";

export default async function CompetitionsPage() {
	const competitions = await getCompetitions();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Competitions"
				action={{
					label: "New Competition",
					href: "/admin/competitions/new",
				}}
			/>

			<Card>
				<CardContent className="pt-6">
					<CompetitionsTable competitions={competitions} />
				</CardContent>
			</Card>
		</div>
	);
}
