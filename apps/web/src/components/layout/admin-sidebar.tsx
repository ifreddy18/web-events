"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="w-64 border-r bg-background">
			<div className="border-b p-6">
				<h2 className="font-semibold">Events Admin</h2>
			</div>

			<nav className="p-3">
				{adminNavigation.map((item) => {
					const Icon = item.icon;

					const isActive = pathname === item.href;

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
								isActive ? "bg-muted font-medium" : "hover:bg-muted",
							)}
						>
							<Icon className="h-4 w-4" />

							{item.title}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
