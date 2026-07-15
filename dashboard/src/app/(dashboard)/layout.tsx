import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar, SIDEBAR_WIDTH } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<AuthGuard>
			<Box sx={{ minHeight: "100vh" }}>
				<Sidebar />
				<Box component="main" sx={{ pl: `${SIDEBAR_WIDTH}px` }}>
					<Box sx={{ minHeight: "100vh", bgcolor: "background.paper" }}>
						{children}
					</Box>
				</Box>
			</Box>
		</AuthGuard>
	);
}
