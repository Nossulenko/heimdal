"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { getToken } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [status, setStatus] = useState<"checking" | "authed">("checking");

	useEffect(() => {
		if (getToken()) {
			setStatus("authed");
		} else {
			router.replace("/login");
		}
	}, [router]);

	if (status === "checking") {
		return (
			<Box
				sx={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<CircularProgress size={22} thickness={5} sx={{ color: "text.disabled" }} />
			</Box>
		);
	}

	return <>{children}</>;
}
