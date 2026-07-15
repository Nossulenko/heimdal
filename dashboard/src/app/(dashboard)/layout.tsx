import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<AuthGuard>
			<div className="min-h-screen">
				<Sidebar />
				<main className="pl-60">
					<div className="min-h-screen bg-white">{children}</div>
				</main>
			</div>
		</AuthGuard>
	);
}
