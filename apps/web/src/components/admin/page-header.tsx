type PageHeaderProps = Readonly<{
	title: string;
	action?: React.ReactNode;
}>;

export function PageHeader({ title, action }: PageHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<h1 className="text-3xl font-bold">{title}</h1>

			{action}
		</div>
	);
}
