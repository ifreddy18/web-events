import { ReactNode } from "react";

import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminShellProps {
	children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
	return (
		<div className="flex min-h-screen">
			<AdminSidebar />

			<div className="flex flex-1 flex-col">
				<AdminHeader />

				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
}
