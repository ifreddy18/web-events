import { ReactNode } from "react";

import { AdminShell } from "@/components/layout/admin-shell";

type AdminLayoutProps = Readonly<{
	children: ReactNode;
}>;

export default function AdminLayout({ children }: AdminLayoutProps) {
	return <AdminShell>{children}</AdminShell>;
}
