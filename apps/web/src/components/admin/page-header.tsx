import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Action {
	label: string;
	href: string;
}

type PageHeaderProps = Readonly<{
	title: string;
	action?: Action;
}>;

export function PageHeader({ title, action }: PageHeaderProps) {
	return (
		<div className="flex items-center justify-between pb-2">
			<h1 className="text-3xl font-bold">{title}</h1>
			{action && (
				<Button asChild>
					<Link href={action.href}>{action.label}</Link>
				</Button>
			)}
		</div>
	);
}
