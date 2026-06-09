import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = Readonly<{
	status: string;
}>;

export function StatusBadge({ status }: StatusBadgeProps) {
	switch (status) {
		case "ACTIVE":
			return <Badge>Active</Badge>;

		case "PUBLISHED":
			return <Badge>Published</Badge>;

		case "COMPLETED":
			return <Badge>Completed</Badge>;

		case "ARCHIVED":
			return <Badge variant="secondary">Archived</Badge>;

		case "DRAFT":
			return <Badge variant="outline">Draft</Badge>;

		case "CANCELLED":
			return <Badge variant="destructive">Cancelled</Badge>;

		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}
