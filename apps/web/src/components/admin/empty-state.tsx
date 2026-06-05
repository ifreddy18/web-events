type EmptyStateProps = Readonly<{
	title: string;
	description: string;
}>;

export function EmptyState({ title, description }: EmptyStateProps) {
	return (
		<div className="rounded-lg border p-10 text-center">
			<h3 className="font-semibold">{title}</h3>

			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}
