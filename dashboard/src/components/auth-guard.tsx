"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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
			<div className="flex min-h-screen items-center justify-center text-sm text-gray-400">
				Loading…
			</div>
		);
	}

	return <>{children}</>;
}
