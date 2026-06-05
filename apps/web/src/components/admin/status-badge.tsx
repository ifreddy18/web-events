import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = Readonly<{
	status: string;
}>;

export function StatusBadge({ status }: StatusBadgeProps) {
	switch (status) {
		case "ACTIVE":
			return <Badge>Active</Badge>;

		case "ARCHIVED":
			return <Badge variant="secondary">Archived</Badge>;

		case "CANCELLED":
			return <Badge variant="destructive">Cancelled</Badge>;

		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}
